"use server";

import { revalidatePath } from "next/cache";
import { markAllNotificationsRead, markNotificationRead, listMyNotifications, countMyUnreadNotifications } from "@/lib/services/notification.service";

export async function markNotificationReadAction(notificationId: string) {
  await markNotificationRead(notificationId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  await markAllNotificationsRead();
  revalidatePath("/", "layout");
}

/** Polled client-side by the notification bell to detect new arrivals without a full page reload — see notification-bell.tsx. */
export async function getNotificationSnapshotAction(limit = 8) {
  const [notifications, unreadCount] = await Promise.all([listMyNotifications(limit), countMyUnreadNotifications()]);
  return { notifications, unreadCount };
}
