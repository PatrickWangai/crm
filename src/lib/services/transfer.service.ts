import "server-only";
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
 * successor is promoted into it. Self-deletion (see deleteOwnAccount
 * below) requires at least one ACCEPTED request here — "verified on both
 * ends" is this acceptance step, not just the outgoing user's say-so.
 */

export async function listTransferCandidates() {
  const actor = await requireAuth();
  if (!actor.department) return [];

  return prisma.user.findMany({
    where: { departmentId: actor.department.id, status: "ACTIVE", id: { not: actor.id } },
    select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } },
    orderBy: { firstName: "asc" },
  });
}

export async function listMyOutgoingTransfers() {
  const actor = await requireAuth();
  return prisma.transferRequest.findMany({
    where: { fromUserId: actor.id },
    include: { toUser: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMyIncomingTransfers() {
  const actor = await requireAuth();
  return prisma.transferRequest.findMany({
    where: { toUserId: actor.id, status: "PENDING" },
    include: { fromUser: { select: { firstName: true, lastName: true, role: { select: { name: true } } } }, department: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function initiateTransfer(toUserId: string) {
  const actor = await requireAuth();
  if (!actor.department) {
    throw new Error("Your account isn't linked to a department yet — ask ICT to set that up first.");
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
    data: { fromUserId: actor.id, toUserId: successor.id, departmentId: actor.department.id, promotesRole },
  });

  await createNotification({
    userId: successor.id,
    type: "SYSTEM",
    title: `${actor.firstName} ${actor.lastName} wants to hand off to you`,
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

  await prisma.$transaction([
    prisma.ticket.updateMany({ where: { assignedToId: request.fromUserId }, data: { assignedToId: actor.id } }),
    prisma.task.updateMany({ where: { assigneeId: request.fromUserId }, data: { assigneeId: actor.id } }),
    prisma.lead.updateMany({ where: { assignedToId: request.fromUserId }, data: { assignedToId: actor.id } }),
    ...(request.promotesRole ? [prisma.user.update({ where: { id: actor.id }, data: { roleId: request.fromUser.roleId } })] : []),
    prisma.transferRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED", respondedAt: new Date() } }),
  ]);

  await recordAudit({
    userId: actor.id,
    action: "user.transfer_accepted",
    entityType: "TransferRequest",
    entityId: requestId,
    previousValue: { fromUserId: request.fromUserId },
    newValue: { toUserId: actor.id, promotesRole: request.promotesRole },
  });

  await createNotification({
    userId: request.fromUserId,
    type: "SYSTEM",
    title: `${actor.firstName} ${actor.lastName} accepted your hand-off`,
    message: "Everything assigned to you has moved over. You can now deactivate your own account from Profile if you're leaving.",
    relatedUrl: "/profile",
  });
}

/** Whether the current user has at least one accepted hand-off — the gate for deleteOwnAccount. */
export async function canDeleteOwnAccount(): Promise<boolean> {
  const actor = await requireAuth();
  const accepted = await prisma.transferRequest.findFirst({ where: { fromUserId: actor.id, status: "ACCEPTED" } });
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
    throw new Error("You need at least one accepted hand-off before you can deactivate your own account — initiate one below and wait for your successor to accept.");
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
