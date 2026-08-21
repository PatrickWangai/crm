"use server";

import { getLiveActivitySnapshot, type LiveActivitySnapshot } from "@/lib/services/live-activity.service";
import { listStaffLiveChatThread, sendStaffLiveChatMessage } from "@/lib/services/live-chat.service";
import type { LiveChatMessage } from "@/lib/validation/public-support";

export async function refreshLiveActivityAction(): Promise<LiveActivitySnapshot> {
  return getLiveActivitySnapshot();
}

export async function fetchStaffChatThreadAction(ticketId: string): Promise<LiveChatMessage[]> {
  return listStaffLiveChatThread(ticketId);
}

export async function sendStaffChatMessageAction(ticketId: string, content: string): Promise<LiveChatMessage> {
  return sendStaffLiveChatMessage(ticketId, content);
}
