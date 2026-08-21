import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { NotificationType } from "@prisma/client";
import { requireAuth } from "@/lib/rbac/guard";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedUrl?: string;
}

/**
 * Called by other services on behalf of the acting user's target (e.g. the
 * agent a lead/ticket/task was assigned to) — intentionally has no permission
 * gate of its own since the caller already enforced the relevant permission.
 * Never throws — a failed notification must not break the calling action.
 *
 * A single chokepoint for every notification in the app, which is what
 * makes the notification-delegate feature (Profile > Notification
 * delegate) possible without touching every individual call site: if the
 * recipient has one set, they get a copy too — a backup contact, not a
 * replacement, so the original recipient still sees it.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    const created = await prisma.notification.create({ data: input });

    const recipient = await prisma.user.findUnique({ where: { id: input.userId }, select: { notificationDelegateId: true } });
    if (recipient?.notificationDelegateId && recipient.notificationDelegateId !== input.userId) {
      await prisma.notification.create({ data: { ...input, userId: recipient.notificationDelegateId } });
    }

    return created;
  } catch (err) {
    console.error("Failed to create notification", err);
    return null;
  }
}

export async function listMyNotifications(limit = 10) {
  const user = await requireAuth();
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listMyNotificationsPaginated(page = 1, pageSize = 20) {
  const user = await requireAuth();
  const where = { userId: user.id };
  const [data, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.notification.count({ where }),
  ]);
  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function countMyUnreadNotifications() {
  const user = await requireAuth();
  return prisma.notification.count({ where: { userId: user.id, isRead: false } });
}

export async function markNotificationRead(notificationId: string) {
  const user = await requireAuth();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead() {
  const user = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
}
