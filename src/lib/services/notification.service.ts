import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/rbac/guard";

export async function listMyNotifications(limit = 10) {
  const user = await requireAuth();
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
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
