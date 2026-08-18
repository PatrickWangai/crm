import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TicketPriority, TicketStatus } from "@prisma/client";
import { requireAuth, requireAnyPermission, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import { pickSlaForTicket } from "@/lib/services/sla.service";
import { isWorkflowActive } from "@/lib/services/workflow.service";
import type { TicketInput } from "@/lib/validation/ticket";

const VIEW_PERMS = ["tickets.view_all", "tickets.view_own"];

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function nextTicketNumber(): Promise<string> {
  const count = await prisma.ticket.count();
  return `TKT-${String(count + 1).padStart(6, "0")}`;
}

export interface ListTicketsParams {
  q?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedToId?: string;
  businessUnitId?: string;
  page?: number;
  pageSize?: number;
}

const ticketListInclude = {
  stakeholder: { select: { id: true, firstName: true, lastName: true, code: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  businessUnit: { select: { id: true, name: true, code: true } },
  sla: { select: { id: true, name: true, resolutionTimeMinutes: true } },
  _count: { select: { comments: true, communications: true, documents: true } },
} as const;

export async function listTickets(params: ListTicketsParams = {}) {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "tickets.view_all");

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      scopedToSelf ? { OR: [{ assignedToId: user.id }, { assignedToId: null }] } : {},
      params.q
        ? {
            OR: [
              { subject: { contains: params.q, mode: "insensitive" as const } },
              { ticketNumber: { contains: params.q, mode: "insensitive" as const } },
              { stakeholder: { firstName: { contains: params.q, mode: "insensitive" as const } } },
              { stakeholder: { lastName: { contains: params.q, mode: "insensitive" as const } } },
            ],
          }
        : {},
      params.status ? { status: params.status } : {},
      params.priority ? { priority: params.priority } : {},
      params.category ? { category: params.category } : {},
      params.businessUnitId ? { businessUnitId: params.businessUnitId } : {},
      !scopedToSelf && params.assignedToId ? { assignedToId: params.assignedToId } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.ticket.findMany({ where, include: ticketListInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.ticket.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** All tickets for the Kanban board, respecting the same RBAC scope as listTickets. */
export async function listTicketsForBoard() {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "tickets.view_all");

  return prisma.ticket.findMany({
    where: scopedToSelf ? { OR: [{ assignedToId: user.id }, { assignedToId: null }] } : undefined,
    include: ticketListInclude,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
}

async function assertCanViewTicket(ticketId: string) {
  const user = await requireAnyPermission(VIEW_PERMS);
  if (hasPermission(user, "tickets.view_all")) return user;

  const record = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToId: true } });
  if (!record || (record.assignedToId && record.assignedToId !== user.id)) {
    throw new ForbiddenError("You can only view tickets assigned to you.");
  }
  return user;
}

export async function getTicketDetail(id: string) {
  await assertCanViewTicket(id);

  return prisma.ticket.findUnique({
    where: { id },
    include: {
      stakeholder: { select: { id: true, firstName: true, lastName: true, code: true, phone: true, email: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, jobTitle: true, email: true } },
      businessUnit: true,
      department: true,
      sla: true,
      comments: { orderBy: { createdAt: "desc" }, include: { user: { select: { firstName: true, lastName: true } } } },
      communications: { orderBy: { occurredAt: "desc" }, include: { staff: { select: { firstName: true, lastName: true } } } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { firstName: true, lastName: true } } } },
      tasks: { orderBy: { createdAt: "desc" }, include: { assignee: { select: { firstName: true, lastName: true } } } },
    },
  });
}

export async function createTicket(input: TicketInput) {
  const actor = await requireAnyPermission(["tickets.create"]);
  const ticketNumber = await nextTicketNumber();
  const businessUnitId = cleanId(input.businessUnitId);
  const sla = await pickSlaForTicket(input.priority, businessUnitId);
  const assignedToId = cleanId(input.assignedToId);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      stakeholderId: input.stakeholderId,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: assignedToId ? "ASSIGNED" : "REQUEST_LOGGED",
      businessUnitId: businessUnitId ?? undefined,
      departmentId: cleanId(input.departmentId) ?? undefined,
      assignedToId: assignedToId ?? undefined,
      slaId: sla?.id,
      dueAt: sla ? new Date(Date.now() + sla.resolutionTimeMinutes * 60_000) : undefined,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "ticket.created",
    entityType: "Ticket",
    entityId: ticket.id,
    newValue: { subject: ticket.subject, priority: ticket.priority, category: ticket.category },
  });

  if (assignedToId) {
    await createNotification({
      userId: assignedToId,
      type: "TICKET_ASSIGNED",
      title: "New ticket assigned",
      message: `${ticket.ticketNumber}: ${ticket.subject}`,
      relatedUrl: `/tickets/${ticket.id}`,
    });
  }

  return ticket;
}

export async function updateTicket(id: string, input: TicketInput) {
  const actor = await requireAnyPermission(["tickets.update"]);
  const before = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  const businessUnitId = cleanId(input.businessUnitId);
  let slaId = before.slaId;
  let dueAt = before.dueAt;
  if (input.priority !== before.priority || businessUnitId !== before.businessUnitId) {
    const sla = await pickSlaForTicket(input.priority, businessUnitId);
    slaId = sla?.id ?? null;
    dueAt = sla ? new Date(Date.now() + sla.resolutionTimeMinutes * 60_000) : null;
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      stakeholderId: input.stakeholderId,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
      businessUnitId: businessUnitId ?? undefined,
      departmentId: cleanId(input.departmentId),
      slaId,
      dueAt,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "ticket.updated",
    entityType: "Ticket",
    entityId: id,
    previousValue: { priority: before.priority, category: before.category },
    newValue: { priority: ticket.priority, category: ticket.category },
  });

  return ticket;
}

export async function updateTicketStatus(id: string, status: TicketStatus, note?: string) {
  const actor = await requireAnyPermission(["tickets.update"]);
  const before = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "COMPLETED" && !before.resolvedAt ? new Date() : undefined,
      closedAt: status === "CLOSED" && !before.closedAt ? new Date() : undefined,
    },
  });

  if (note) {
    await prisma.ticketComment.create({
      data: { ticketId: id, userId: actor.id, comment: `Status changed to ${status.replace(/_/g, " ")}: ${note}`, isInternal: true },
    });
  }

  await recordAudit({
    userId: actor.id,
    action: "ticket.status_changed",
    entityType: "Ticket",
    entityId: id,
    previousValue: { status: before.status },
    newValue: { status },
  });

  return ticket;
}

export async function assignTicket(id: string, assignedToId: string | null) {
  const actor = await requireAnyPermission(["tickets.assign"]);
  const before = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { assignedToId, status: assignedToId && before.status === "REQUEST_LOGGED" ? "ASSIGNED" : undefined },
  });

  await recordAudit({
    userId: actor.id,
    action: "ticket.assigned",
    entityType: "Ticket",
    entityId: id,
    previousValue: { assignedToId: before.assignedToId },
    newValue: { assignedToId },
  });

  if (assignedToId && assignedToId !== before.assignedToId) {
    await createNotification({
      userId: assignedToId,
      type: "TICKET_ASSIGNED",
      title: "Ticket assigned to you",
      message: `${ticket.ticketNumber}: ${ticket.subject}`,
      relatedUrl: `/tickets/${ticket.id}`,
    });
  }

  return ticket;
}

export async function addTicketComment(id: string, comment: string, isInternal: boolean) {
  const actor = await requireAuth();
  await assertCanViewTicket(id);
  if (!hasPermission(actor, "tickets.update")) {
    throw new ForbiddenError("You do not have permission to comment on tickets.");
  }

  const record = await prisma.ticketComment.create({
    data: { ticketId: id, userId: actor.id, comment, isInternal },
  });

  await recordAudit({ userId: actor.id, action: "ticket.commented", entityType: "Ticket", entityId: id, newValue: { isInternal } });

  return record;
}

/**
 * Scans open tickets against their SLA due date and notifies the assignee when
 * at risk (past 75% of the allotted time) or breached. Intended for a scheduled
 * job; safe to call repeatedly — Communication/AuditLog aren't used to dedupe,
 * so this is meant to be triggered a few times a day, not on every request.
 */
export async function checkSlaRisk() {
  if (!(await isWorkflowActive("ticket.sla_risk_check"))) return 0;

  const openTickets = await prisma.ticket.findMany({
    where: { status: { notIn: ["COMPLETED", "CLOSED"] }, dueAt: { not: null }, assignedToId: { not: null } },
  });

  const now = Date.now();
  let flagged = 0;
  for (const ticket of openTickets) {
    if (!ticket.dueAt || !ticket.assignedToId) continue;
    const due = ticket.dueAt.getTime();
    const created = ticket.createdAt.getTime();
    const elapsedFraction = (now - created) / (due - created);
    const breached = due < now;

    if (breached) {
      await createNotification({
        userId: ticket.assignedToId,
        type: "SLA_BREACH",
        title: "SLA breached",
        message: `${ticket.ticketNumber}: ${ticket.subject}`,
        relatedUrl: `/tickets/${ticket.id}`,
      });
      flagged += 1;
    } else if (elapsedFraction >= 0.75) {
      await createNotification({
        userId: ticket.assignedToId,
        type: "SLA_RISK",
        title: "Ticket approaching SLA deadline",
        message: `${ticket.ticketNumber}: ${ticket.subject}`,
        relatedUrl: `/tickets/${ticket.id}`,
      });
      flagged += 1;
    }
  }

  return flagged;
}

export async function deleteTicket(id: string) {
  const actor = await requireAnyPermission(["tickets.delete"]);

  const [communications, documents, tasks] = await Promise.all([
    prisma.communication.count({ where: { relatedTicketId: id } }),
    prisma.document.count({ where: { ticketId: id } }),
    prisma.task.count({ where: { relatedTicketId: id } }),
  ]);
  const blockers: string[] = [];
  if (communications) blockers.push(`${communications} communication(s)`);
  if (documents) blockers.push(`${documents} document(s)`);
  if (tasks) blockers.push(`${tasks} task(s)`);
  if (blockers.length > 0) {
    throw new Error(`Cannot delete: this ticket has linked records — ${blockers.join(", ")}.`);
  }

  await prisma.ticketComment.deleteMany({ where: { ticketId: id } });
  await prisma.ticket.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "ticket.deleted", entityType: "Ticket", entityId: id });
}
