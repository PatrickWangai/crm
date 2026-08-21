import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TicketPriority, TicketStatus } from "@prisma/client";
import { requireAuth, requireAnyPermission, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import { notifyTicketAccepted, notifyTicketCompleted, notifyTicketForwarded } from "@/lib/notifications/ticket-events";
import { notifyCustomerReceived, notifyCustomerStageChanged } from "@/lib/notifications/customer-events";
import { getSupportStage } from "@/lib/support-stage";
import { CUSTOMER_FACING_DEPARTMENT_CODES, resolveCareDepartment, getDepartmentMembers } from "@/lib/services/department-routing";
import { pickSlaForTicket } from "@/lib/services/sla.service";
import { isWorkflowActive } from "@/lib/services/workflow.service";
import { filterVisibleDocuments } from "@/lib/services/document.service";
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
  department: { select: { id: true, name: true, code: true } },
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
  const user = await assertCanViewTicket(id);

  const ticket = await prisma.ticket.findUnique({
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
  if (!ticket) return null;
  return { ...ticket, documents: filterVisibleDocuments(user, ticket.documents) };
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
    include: { stakeholder: { select: { firstName: true, email: true } } },
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

  await notifyCustomerReceived(ticket, ticket.stakeholder);

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
    include: { stakeholder: { select: { firstName: true, email: true } } },
  });

  if (status === "COMPLETED" && before.status !== "COMPLETED") {
    await notifyTicketCompleted(ticket, actor);
  }

  const stageBefore = getSupportStage(before.status).stage;
  const stageAfter = getSupportStage(status).stage;
  if (stageAfter > stageBefore) {
    await notifyCustomerStageChanged(ticket, ticket.stakeholder, stageAfter);
  }

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

/**
 * The explicit "Accept" step a department takes on an incoming request —
 * self-assign plus confirm (or tighten/loosen) the response deadline in one
 * action, mirroring a restaurant tapping "Accept Order" with a prep time.
 * Passing dueAt as null keeps whatever deadline the ticket already has
 * (usually the SLA-computed one from creation) — staff aren't required to
 * touch it, only to confirm they've taken the request.
 */
export async function acceptTicket(id: string, assignedToId: string, dueAt: Date | null) {
  const actor = await requireAnyPermission(["tickets.assign"]);
  const before = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      assignedToId,
      status: before.status === "REQUEST_LOGGED" ? "ASSIGNED" : undefined,
      dueAt: dueAt ?? before.dueAt,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "ticket.accepted",
    entityType: "Ticket",
    entityId: id,
    previousValue: { assignedToId: before.assignedToId, dueAt: before.dueAt },
    newValue: { assignedToId, dueAt: ticket.dueAt },
  });

  await notifyTicketAccepted(ticket, actor);

  return ticket;
}

/**
 * Hands a ticket off to a different department entirely — not the same as
 * reassigning to a different person within the same department (see
 * assignTicket below). Clears whoever currently owns it and resets status
 * back to Request Logged (unless already Completed/Closed) so the receiving
 * department goes through their own Accept step fresh, rather than
 * inheriting someone else's in-progress work silently.
 */
export async function forwardTicketToDepartment(id: string, departmentId: string, note: string | null) {
  const actor = await requireAnyPermission(["tickets.assign"]);
  const before = await prisma.ticket.findUniqueOrThrow({ where: { id } });
  const department = await prisma.department.findUniqueOrThrow({ where: { id: departmentId }, select: { id: true, name: true, code: true } });

  if (!CUSTOMER_FACING_DEPARTMENT_CODES.includes(department.code)) {
    throw new Error(`${department.name} doesn't handle customer tickets — pick a department that does.`);
  }

  const reopen = before.status !== "COMPLETED" && before.status !== "CLOSED";

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      departmentId: department.id,
      assignedToId: null,
      status: reopen ? "REQUEST_LOGGED" : undefined,
    },
  });

  if (note) {
    await prisma.ticketComment.create({
      data: { ticketId: id, userId: actor.id, comment: `Forwarded to ${department.name}: ${note}`, isInternal: true },
    });
  }

  await recordAudit({
    userId: actor.id,
    action: "ticket.forwarded",
    entityType: "Ticket",
    entityId: id,
    previousValue: { departmentId: before.departmentId, assignedToId: before.assignedToId },
    newValue: { departmentId: department.id },
  });

  await notifyTicketForwarded(ticket, department.id, department.name, actor, note);

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

const SLA_RISK_THRESHOLD = 0.8;

/**
 * Scans open tickets (assigned or not) against their SLA due date and
 * notifies whoever should act when a ticket is at risk (past 80% of the
 * allotted time) or breached. The relevant Customer Care team (Real Estate
 * or SACCO, resolved from the ticket's business unit) is always notified
 * alongside the assignee — whether it's their own department's ticket or
 * another department's — so a near-breach request never slips through
 * just because nobody happened to check that specific queue; an
 * unassigned ticket notifies Customer Care alone, since there's no
 * assignee. Intended for a scheduled job; safe to call repeatedly —
 * Communication/AuditLog aren't used to dedupe, so this is meant to be
 * triggered a few times a day, not on every request.
 */
export async function checkSlaRisk() {
  await requireAnyPermission(["tickets.assign"]);
  if (!(await isWorkflowActive("ticket.sla_risk_check"))) return 0;

  const openTickets = await prisma.ticket.findMany({
    where: { status: { notIn: ["COMPLETED", "CLOSED"] }, dueAt: { not: null } },
  });

  const businessUnitIds = Array.from(new Set(openTickets.map((t) => t.businessUnitId).filter((id): id is string => !!id)));
  const businessUnits = businessUnitIds.length ? await prisma.businessUnit.findMany({ where: { id: { in: businessUnitIds } }, select: { id: true, code: true } }) : [];
  const businessUnitCodeById = new Map(businessUnits.map((bu) => [bu.id, bu.code]));

  const careTeamCache = new Map<string, { id: string }[]>();
  async function getCareTeamMembers(businessUnitCode: string | null) {
    const care = resolveCareDepartment(businessUnitCode);
    if (!careTeamCache.has(care.code)) {
      const dept = await prisma.department.findUnique({ where: { code: care.code }, select: { id: true } });
      careTeamCache.set(care.code, dept ? await getDepartmentMembers(dept.id) : []);
    }
    return careTeamCache.get(care.code)!;
  }

  const now = Date.now();
  let flagged = 0;
  for (const ticket of openTickets) {
    if (!ticket.dueAt) continue;
    const due = ticket.dueAt.getTime();
    const created = ticket.createdAt.getTime();
    const elapsedFraction = (now - created) / (due - created);
    const breached = due < now;
    if (!breached && elapsedFraction < SLA_RISK_THRESHOLD) continue;

    const businessUnitCode = ticket.businessUnitId ? (businessUnitCodeById.get(ticket.businessUnitId) ?? null) : null;
    const careMembers = await getCareTeamMembers(businessUnitCode);
    const recipientIds = new Set<string>(careMembers.map((m) => m.id));
    if (ticket.assignedToId) recipientIds.add(ticket.assignedToId);

    const type = breached ? "SLA_BREACH" : "SLA_RISK";
    const title = breached ? "SLA breached" : "Ticket approaching SLA deadline (80%)";
    const message = `${ticket.ticketNumber}: ${ticket.subject}`;

    await Promise.all(Array.from(recipientIds).map((userId) => createNotification({ userId, type, title, message, relatedUrl: `/tickets/${ticket.id}` })));
    flagged += 1;
  }

  return flagged;
}

/**
 * Manual escalation — lets whoever noticed a ticket is close to its
 * deadline (via the SLA-risk notification above, or just browsing) send an
 * immediate reminder rather than waiting for the next periodic check.
 * Targets the assignee if there is one, otherwise the whole department —
 * an unassigned ticket needs someone to pick it up, not a reminder aimed
 * at nobody.
 */
export async function nudgeTicket(id: string) {
  const actor = await requireAnyPermission(["tickets.assign"]);
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  const recipientIds = new Set<string>();
  if (ticket.assignedToId) {
    recipientIds.add(ticket.assignedToId);
  } else if (ticket.departmentId) {
    const members = await getDepartmentMembers(ticket.departmentId);
    for (const m of members) recipientIds.add(m.id);
  }
  recipientIds.delete(actor.id);

  await Promise.all(
    Array.from(recipientIds).map((userId) =>
      createNotification({
        userId,
        type: "SLA_RISK",
        title: `Nudge from ${actor.firstName} ${actor.lastName}`,
        message: `${ticket.ticketNumber}: ${ticket.subject} — please check on this, it's close to its SLA deadline.`,
        relatedUrl: `/tickets/${id}`,
      }),
    ),
  );

  await recordAudit({ userId: actor.id, action: "ticket.nudged", entityType: "Ticket", entityId: id });
  return recipientIds.size;
}

/**
 * Read-only version of the same 80%-elapsed-or-breached check checkSlaRisk()
 * does — for displaying a summary (e.g. in the staff assistant) without
 * sending a fresh round of notifications every time someone just wants to
 * look. Scoped the same way the tickets list already is: everything for
 * tickets.view_all, only the viewer's own for tickets.view_own.
 */
export async function listAtRiskTickets() {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "tickets.view_all");

  const openTickets = await prisma.ticket.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CLOSED"] },
      dueAt: { not: null },
      ...(scopedToSelf ? { OR: [{ assignedToId: user.id }, { assignedToId: null }] } : {}),
    },
    select: { id: true, ticketNumber: true, subject: true, dueAt: true, createdAt: true },
  });

  const now = Date.now();
  return openTickets
    .filter((t) => {
      if (!t.dueAt) return false;
      const elapsed = (now - t.createdAt.getTime()) / (t.dueAt.getTime() - t.createdAt.getTime());
      return t.dueAt.getTime() < now || elapsed >= SLA_RISK_THRESHOLD;
    })
    .map((t) => ({ ticketNumber: t.ticketNumber, subject: t.subject, breached: t.dueAt!.getTime() < now }));
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
