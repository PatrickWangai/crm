import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import { DEPARTMENT_HEAD_ROLE } from "@/lib/rbac/department-team-roles";

/**
 * "Leave & hand off" — available to anyone in an active department, not
 * just heads (see succeedDepartmentHead in user.service.ts, which is the
 * older, head-only version this generalizes). A two-party flow: the
 * outgoing user picks a successor, who must explicitly accept before
 * anything moves — their currently-assigned tickets/tasks/leads transfer,
 * and if the outgoing user holds their department's defined head role
 * (DEPARTMENT_HEAD_ROLE) and the successor doesn't already have it, the
 * successor is promoted into it.
 *
 * Two flavors, chosen at initiation (durationDays):
 *   - Permanent (durationDays: null) — the original behavior. Self-
 *     deletion (see deleteOwnAccount below) requires at least one
 *     ACCEPTED *permanent* request — "verified on both ends" is this
 *     acceptance step, not just the outgoing user's say-so. A temporary
 *     hand-off never unlocks this, since the point of one is that the
 *     outgoing user is coming back.
 *   - Temporary (durationDays: a positive number, e.g. covering someone's
 *     leave) — same acceptance flow, but TransferredItem rows record
 *     exactly what moved, and it auto-reverts once expiresAt passes
 *     (checked lazily whenever either party's transfers are listed — see
 *     checkExpiredTransfers; there's no real background scheduler in this
 *     app, same "manual/lazy over cron" choice as ticket.service.ts's SLA
 *     risk check), or either party can end it early via revertTransfer.
 *     Only items still actually held by the successor at revert time move
 *     back — anything they've since reassigned elsewhere stays put.
 */

const MAX_DURATION_DAYS = 365;

export async function listTransferCandidates() {
  const actor = await requireAuth();
  if (!actor.department) return [];

  return prisma.user.findMany({
    where: { departmentId: actor.department.id, status: "ACTIVE", id: { not: actor.id } },
    select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } },
    orderBy: { firstName: "asc" },
  });
}

/** Reverts an accepted temporary transfer's tickets/tasks/leads + role (if promoted) — shared by the manual end-now action and the lazy expiry check. Only hands back items still actually held by the successor. */
async function buildRevertOps(request: { id: string; fromUserId: string; toUserId: string; promotesRole: boolean; originalToUserRoleId: string | null }) {
  const items = await prisma.transferredItem.findMany({ where: { transferRequestId: request.id } });
  const idsByType = (type: string) => items.filter((i) => i.entityType === type).map((i) => i.entityId);
  const ticketIds = idsByType("TICKET");
  const taskIds = idsByType("TASK");
  const leadIds = idsByType("LEAD");

  const [heldTickets, heldTasks, heldLeads] = await Promise.all([
    ticketIds.length ? prisma.ticket.findMany({ where: { id: { in: ticketIds }, assignedToId: request.toUserId }, select: { id: true } }) : [],
    taskIds.length ? prisma.task.findMany({ where: { id: { in: taskIds }, assigneeId: request.toUserId }, select: { id: true } }) : [],
    leadIds.length ? prisma.lead.findMany({ where: { id: { in: leadIds }, assignedToId: request.toUserId }, select: { id: true } }) : [],
  ]);

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (heldTickets.length) ops.push(prisma.ticket.updateMany({ where: { id: { in: heldTickets.map((t) => t.id) } }, data: { assignedToId: request.fromUserId } }));
  if (heldTasks.length) ops.push(prisma.task.updateMany({ where: { id: { in: heldTasks.map((t) => t.id) } }, data: { assigneeId: request.fromUserId } }));
  if (heldLeads.length) ops.push(prisma.lead.updateMany({ where: { id: { in: heldLeads.map((t) => t.id) } }, data: { assignedToId: request.fromUserId } }));
  if (request.promotesRole && request.originalToUserRoleId) {
    ops.push(prisma.user.update({ where: { id: request.toUserId }, data: { roleId: request.originalToUserRoleId } }));
  }
  return ops;
}

/** Auto-reverts any of this user's accepted temporary hand-offs (either direction) that have passed their expiry — called lazily whenever their transfers are listed, since there's no real background scheduler here. */
async function checkExpiredTransfers(userId: string) {
  const expired = await prisma.transferRequest.findMany({
    where: {
      status: "ACCEPTED",
      revertedAt: null,
      durationDays: { not: null },
      expiresAt: { lte: new Date() },
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
  });

  for (const request of expired) {
    const ops = await buildRevertOps(request);
    ops.push(prisma.transferRequest.update({ where: { id: request.id }, data: { revertedAt: new Date() } }));
    await prisma.$transaction(ops);
    await recordAudit({ userId: null, action: "user.transfer_auto_reverted", entityType: "TransferRequest", entityId: request.id });
    await Promise.all(
      [request.fromUserId, request.toUserId].map((id) =>
        createNotification({
          userId: id,
          type: "SYSTEM",
          title: "A temporary hand-off has ended",
          message: "Its time period is up — everything still with the temporary owner has moved back automatically.",
          relatedUrl: "/profile",
        }),
      ),
    );
  }
}

export async function listMyOutgoingTransfers() {
  const actor = await requireAuth();
  await checkExpiredTransfers(actor.id);
  return prisma.transferRequest.findMany({
    where: { fromUserId: actor.id },
    include: { toUser: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMyIncomingTransfers() {
  const actor = await requireAuth();
  await checkExpiredTransfers(actor.id);
  return prisma.transferRequest.findMany({
    where: { toUserId: actor.id, status: "PENDING" },
    include: { fromUser: { select: { firstName: true, lastName: true, role: { select: { name: true } } } }, department: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Currently-in-effect temporary hand-offs involving the caller, either direction — distinct from the pending/outgoing lists above, this is "what's active right now that someone might want to end early." */
export async function listMyActiveTemporaryHandoffs() {
  const actor = await requireAuth();
  await checkExpiredTransfers(actor.id);
  return prisma.transferRequest.findMany({
    where: {
      status: "ACCEPTED",
      revertedAt: null,
      durationDays: { not: null },
      OR: [{ fromUserId: actor.id }, { toUserId: actor.id }],
    },
    include: {
      fromUser: { select: { firstName: true, lastName: true } },
      toUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { expiresAt: "asc" },
  });
}

export async function initiateTransfer(toUserId: string, durationDays: number | null) {
  const actor = await requireAuth();
  if (!actor.department) {
    throw new Error("Your account isn't linked to a department yet — ask ICT to set that up first.");
  }
  if (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_DURATION_DAYS)) {
    throw new Error(`A time-limited hand-off must be between 1 and ${MAX_DURATION_DAYS} days.`);
  }

  const successor = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!successor || successor.departmentId !== actor.department.id || successor.status !== "ACTIVE") {
    throw new Error("Choose an active teammate already in your department.");
  }

  const existingPending = await prisma.transferRequest.findFirst({ where: { fromUserId: actor.id, status: "PENDING" } });
  if (existingPending) {
    throw new Error("You already have a pending hand-off request — cancel it first if you want to choose someone else.");
  }

  const headRoleSlug = DEPARTMENT_HEAD_ROLE[actor.department.code];
  const promotesRole = !!headRoleSlug && actor.role.slug === headRoleSlug && successor.roleId !== actor.roleId;

  const request = await prisma.transferRequest.create({
    data: { fromUserId: actor.id, toUserId: successor.id, departmentId: actor.department.id, promotesRole, durationDays: durationDays ?? undefined },
  });

  const durationLabel = durationDays ? ` for ${durationDays} day${durationDays === 1 ? "" : "s"}` : "";
  await createNotification({
    userId: successor.id,
    type: "SYSTEM",
    title: `${actor.firstName} ${actor.lastName} wants to hand off to you${durationLabel}`,
    message: promotesRole
      ? `This includes their role (${actor.role.name}) and everything currently assigned to them.`
      : "This includes everything currently assigned to them.",
    relatedUrl: "/profile",
  });

  return request;
}

export async function cancelTransfer(requestId: string) {
  const actor = await requireAuth();
  const request = await prisma.transferRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.fromUserId !== actor.id) throw new Error("You can only cancel your own request.");
  if (request.status !== "PENDING") throw new Error("This request has already been responded to.");

  await prisma.transferRequest.update({ where: { id: requestId }, data: { status: "CANCELLED", respondedAt: new Date() } });
}

export async function respondToTransfer(requestId: string, accept: boolean) {
  const actor = await requireAuth();
  const request = await prisma.transferRequest.findUniqueOrThrow({ where: { id: requestId }, include: { fromUser: true } });
  if (request.toUserId !== actor.id) throw new Error("This request isn't addressed to you.");
  if (request.status !== "PENDING") throw new Error("This request has already been responded to.");

  if (!accept) {
    await prisma.transferRequest.update({ where: { id: requestId }, data: { status: "DECLINED", respondedAt: new Date() } });
    await createNotification({
      userId: request.fromUserId,
      type: "SYSTEM",
      title: `${actor.firstName} ${actor.lastName} declined your hand-off request`,
      message: "Choose someone else, or check with them directly.",
      relatedUrl: "/profile",
    });
    return;
  }

  const respondedAt = new Date();
  const expiresAt = request.durationDays ? new Date(respondedAt.getTime() + request.durationDays * 24 * 60 * 60 * 1000) : null;

  const [movingTickets, movingTasks, movingLeads] = await Promise.all([
    prisma.ticket.findMany({ where: { assignedToId: request.fromUserId }, select: { id: true } }),
    prisma.task.findMany({ where: { assigneeId: request.fromUserId }, select: { id: true } }),
    prisma.lead.findMany({ where: { assignedToId: request.fromUserId }, select: { id: true } }),
  ]);

  await prisma.$transaction([
    prisma.ticket.updateMany({ where: { assignedToId: request.fromUserId }, data: { assignedToId: actor.id } }),
    prisma.task.updateMany({ where: { assigneeId: request.fromUserId }, data: { assigneeId: actor.id } }),
    prisma.lead.updateMany({ where: { assignedToId: request.fromUserId }, data: { assignedToId: actor.id } }),
    ...(request.promotesRole ? [prisma.user.update({ where: { id: actor.id }, data: { roleId: request.fromUser.roleId } })] : []),
    prisma.transferredItem.createMany({
      data: [
        ...movingTickets.map((t) => ({ transferRequestId: requestId, entityType: "TICKET", entityId: t.id })),
        ...movingTasks.map((t) => ({ transferRequestId: requestId, entityType: "TASK", entityId: t.id })),
        ...movingLeads.map((t) => ({ transferRequestId: requestId, entityType: "LEAD", entityId: t.id })),
      ],
    }),
    prisma.transferRequest.update({
      where: { id: requestId },
      data: {
        status: "ACCEPTED",
        respondedAt,
        expiresAt: expiresAt ?? undefined,
        originalToUserRoleId: request.promotesRole ? actor.roleId : undefined,
      },
    }),
  ]);

  await recordAudit({
    userId: actor.id,
    action: "user.transfer_accepted",
    entityType: "TransferRequest",
    entityId: requestId,
    previousValue: { fromUserId: request.fromUserId },
    newValue: { toUserId: actor.id, promotesRole: request.promotesRole, durationDays: request.durationDays },
  });

  const isTemporary = !!request.durationDays;
  await createNotification({
    userId: request.fromUserId,
    type: "SYSTEM",
    title: `${actor.firstName} ${actor.lastName} accepted your hand-off`,
    message: isTemporary
      ? `Everything assigned to you has moved over for ${request.durationDays} day${request.durationDays === 1 ? "" : "s"} — it reverts automatically, or you can end it early from Profile.`
      : "Everything assigned to you has moved over. You can now deactivate your own account from Profile if you're leaving.",
    relatedUrl: "/profile",
  });
}

/** Ends a temporary hand-off before its time is up — callable by either party. Hands back only items still actually held by the successor. */
export async function revertTransfer(requestId: string) {
  const actor = await requireAuth();
  const request = await prisma.transferRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.fromUserId !== actor.id && request.toUserId !== actor.id) throw new Error("This hand-off doesn't involve you.");
  if (request.status !== "ACCEPTED") throw new Error("This hand-off was never accepted.");
  if (request.durationDays === null) throw new Error("This was a permanent hand-off — it can't be reverted.");
  if (request.revertedAt) throw new Error("This hand-off has already ended.");

  const ops = await buildRevertOps(request);
  ops.push(prisma.transferRequest.update({ where: { id: requestId }, data: { revertedAt: new Date() } }));
  await prisma.$transaction(ops);

  await recordAudit({ userId: actor.id, action: "user.transfer_reverted", entityType: "TransferRequest", entityId: requestId });

  const otherPartyId = actor.id === request.fromUserId ? request.toUserId : request.fromUserId;
  await createNotification({
    userId: otherPartyId,
    type: "SYSTEM",
    title: "A temporary hand-off has ended",
    message: `${actor.firstName} ${actor.lastName} ended it early — everything still with the temporary owner has moved back.`,
    relatedUrl: "/profile",
  });
}

/** Whether the current user has at least one accepted *permanent* hand-off — the gate for deleteOwnAccount. A temporary hand-off never counts: the point of one is that the outgoing user is coming back. */
export async function canDeleteOwnAccount(): Promise<boolean> {
  const actor = await requireAuth();
  const accepted = await prisma.transferRequest.findFirst({ where: { fromUserId: actor.id, status: "ACCEPTED", durationDays: null } });
  return !!accepted;
}

/**
 * Self-service "delete my account" — implemented as deactivation
 * (status: INACTIVE), the same mechanism succeedDepartmentHead already
 * used, rather than a real row delete: a hard delete would either fail on
 * foreign keys (audit logs, communications, everything else a real
 * working account accumulates) or require destroying that history, which
 * "delete my account" isn't asking for — it's asking to no longer be an
 * active account with things routed to it, which deactivation achieves.
 */
export async function deleteOwnAccount() {
  const actor = await requireAuth();
  const eligible = await canDeleteOwnAccount();
  if (!eligible) {
    throw new Error("You need at least one accepted permanent hand-off before you can deactivate your own account — initiate one below and wait for your successor to accept.");
  }

  await prisma.user.update({ where: { id: actor.id }, data: { status: "INACTIVE" } });
  await recordAudit({ userId: actor.id, action: "user.self_deactivated", entityType: "User", entityId: actor.id });
}

export async function setNotificationDelegate(delegateUserId: string | null) {
  const actor = await requireAuth();

  if (delegateUserId) {
    if (delegateUserId === actor.id) throw new Error("Choose someone else, not yourself.");
    const delegate = await prisma.user.findUnique({ where: { id: delegateUserId } });
    if (!delegate || delegate.status !== "ACTIVE") throw new Error("Choose an active teammate.");
  }

  await prisma.user.update({ where: { id: actor.id }, data: { notificationDelegateId: delegateUserId } });
  await recordAudit({
    userId: actor.id,
    action: "user.notification_delegate_changed",
    entityType: "User",
    entityId: actor.id,
    newValue: { notificationDelegateId: delegateUserId },
  });
}
