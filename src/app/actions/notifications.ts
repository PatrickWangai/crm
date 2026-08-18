"use server";

import { revalidatePath } from "next/cache";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/services/notification.service";

export async function markNotificationReadAction(notificationId: string) {
  await markNotificationRead(notificationId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  await markAllNotificationsRead();
  revalidatePath("/", "layout");
}
