import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { requireAuth, requireAnyPermission, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import { notifyDepartmentTask } from "@/lib/notifications/task-events";
import { isWorkflowActive } from "@/lib/services/workflow.service";
import type { TaskInput } from "@/lib/validation/task";

const VIEW_PERMS = ["tasks.view_all", "tasks.view_own"];

export type TaskTarget = { stakeholderId: string } | { leadId: string } | { ticketId: string } | { propertyId: string } | undefined;

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function nextTaskCode(): Promise<string> {
  const count = await prisma.task.count();
  return `TSK-${String(count + 1).padStart(6, "0")}`;
}

export interface ListTasksParams {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  page?: number;
  pageSize?: number;
}

const taskListInclude = {
  assignee: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  department: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
} as const;

export async function listTasks(params: ListTasksParams = {}) {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "tasks.view_all");

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      scopedToSelf ? { OR: [{ assigneeId: user.id }, { createdById: user.id }, { assigneeId: null }] } : {},
      params.q ? { title: { contains: params.q, mode: "insensitive" as const } } : {},
      params.status ? { status: params.status } : {},
      params.priority ? { priority: params.priority } : {},
      !scopedToSelf && params.assigneeId ? { assigneeId: params.assigneeId } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.task.findMany({ where, include: taskListInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.task.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listTasksForBoard() {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "tasks.view_all");

  return prisma.task.findMany({
    where: scopedToSelf ? { OR: [{ assigneeId: user.id }, { createdById: user.id }, { assigneeId: null }] } : undefined,
    include: taskListInclude,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
}

async function assertCanViewTask(taskId: string) {
  const user = await requireAnyPermission(VIEW_PERMS);
  if (hasPermission(user, "tasks.view_all")) return user;

  const record = await prisma.task.findUnique({ where: { id: taskId }, select: { assigneeId: true, createdById: true } });
  if (!record || (record.assigneeId && record.assigneeId !== user.id && record.createdById !== user.id)) {
    throw new ForbiddenError("You can only view tasks assigned to or created by you.");
  }
  return user;
}

export async function getTaskDetail(id: string) {
  await assertCanViewTask(id);

  return prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      department: true,
      relatedStakeholder: { select: { id: true, firstName: true, lastName: true, code: true } },
      relatedLead: { select: { id: true, firstName: true, lastName: true, code: true } },
      relatedTicket: { select: { id: true, ticketNumber: true, subject: true } },
      relatedProperty: { select: { id: true, name: true, code: true } },
      comments: { orderBy: { createdAt: "desc" }, include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
}

export async function createTask(target: TaskTarget, input: TaskInput) {
  const actor = await requireAnyPermission(["tasks.create"]);
  const code = await nextTaskCode();
  const assigneeId = cleanId(input.assigneeId);

  const task = await prisma.task.create({
    data: {
      code,
      title: input.title,
      description: input.description || undefined,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      assigneeId: assigneeId ?? undefined,
      departmentId: cleanId(input.departmentId) ?? undefined,
      createdById: actor.id,
      relatedStakeholderId: target && "stakeholderId" in target ? target.stakeholderId : undefined,
      relatedLeadId: target && "leadId" in target ? target.leadId : undefined,
      relatedTicketId: target && "ticketId" in target ? target.ticketId : undefined,
      relatedPropertyId: target && "propertyId" in target ? target.propertyId : undefined,
    },
  });

  await recordAudit({ userId: actor.id, action: "task.created", entityType: "Task", entityId: task.id, newValue: { title: task.title } });

  if (assigneeId) {
    await createNotification({
      userId: assigneeId,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: task.title,
      relatedUrl: `/tasks/${task.id}`,
    });
  } else if (task.departmentId) {
    // Routed to a department, not a specific person — notify everyone there so
    // whoever's free can self-assign, same pattern as unassigned tickets.
    const department = await prisma.department.findUnique({ where: { id: task.departmentId }, select: { name: true } });
    if (department) await notifyDepartmentTask(task, task.departmentId, department.name);
  }

  return task;
}

export async function updateTask(id: string, input: TaskInput) {
  const actor = await requireAnyPermission(["tasks.update"]);
  const before = await prisma.task.findUniqueOrThrow({ where: { id } });
  const newDepartmentId = cleanId(input.departmentId);

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || undefined,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      departmentId: newDepartmentId,
    },
  });

  await recordAudit({ userId: actor.id, action: "task.updated", entityType: "Task", entityId: id, newValue: { title: task.title } });

  // Newly routed to a different department, with no specific assignee — let that department know, same as on creation.
  if (newDepartmentId && newDepartmentId !== before.departmentId && !task.assigneeId) {
    const department = await prisma.department.findUnique({ where: { id: newDepartmentId }, select: { name: true } });
    if (department) await notifyDepartmentTask(task, newDepartmentId, department.name);
  }

  return task;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const actor = await requireAuth();
  await assertCanViewTask(id);
  if (!hasPermission(actor, "tasks.update")) throw new ForbiddenError("You do not have permission to update tasks.");

  const before = await prisma.task.findUniqueOrThrow({ where: { id } });
  const task = await prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "COMPLETED" && !before.completedAt ? new Date() : undefined },
  });

  await recordAudit({
    userId: actor.id,
    action: "task.status_changed",
    entityType: "Task",
    entityId: id,
    previousValue: { status: before.status },
    newValue: { status },
  });

  return task;
}

export async function assignTask(id: string, assigneeId: string | null) {
  const actor = await requireAnyPermission(["tasks.assign"]);
  const before = await prisma.task.findUniqueOrThrow({ where: { id } });

  const task = await prisma.task.update({ where: { id }, data: { assigneeId } });

  await recordAudit({
    userId: actor.id,
    action: "task.assigned",
    entityType: "Task",
    entityId: id,
    previousValue: { assigneeId: before.assigneeId },
    newValue: { assigneeId },
  });

  if (assigneeId && assigneeId !== before.assigneeId) {
    await createNotification({ userId: assigneeId, type: "TASK_ASSIGNED", title: "Task assigned to you", message: task.title, relatedUrl: `/tasks/${task.id}` });
  }

  return task;
}

export async function addTaskComment(id: string, comment: string) {
  const actor = await requireAuth();
  await assertCanViewTask(id);
  if (!hasPermission(actor, "tasks.update")) throw new ForbiddenError("You do not have permission to comment on tasks.");

  const record = await prisma.taskComment.create({ data: { taskId: id, userId: actor.id, comment } });
  await recordAudit({ userId: actor.id, action: "task.commented", entityType: "Task", entityId: id });
  return record;
}

export async function deleteTask(id: string) {
  const actor = await requireAnyPermission(["tasks.delete"]);
  const documents = await prisma.document.count({ where: { taskId: id } });
  if (documents > 0) throw new Error(`Cannot delete: this task has ${documents} linked document(s).`);

  await prisma.taskComment.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "task.deleted", entityType: "Task", entityId: id });
}

/** Flags tasks past their due date as OVERDUE and notifies the assignee. Intended for a scheduled job; safe to call repeatedly. */
export async function flagOverdueTasks() {
  await requireAnyPermission(["tasks.assign"]);
  if (!(await isWorkflowActive("task.overdue_check"))) return 0;

  const overdue = await prisma.task.findMany({
    where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: new Date() } },
  });

  for (const task of overdue) {
    await prisma.task.update({ where: { id: task.id }, data: { status: "OVERDUE" } });
    if (task.assigneeId) {
      await createNotification({
        userId: task.assigneeId,
        type: "TASK_OVERDUE",
        title: "Task overdue",
        message: task.title,
        relatedUrl: `/tasks/${task.id}`,
      });
    }
  }

  return overdue.length;
}
