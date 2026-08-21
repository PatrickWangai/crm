"use server";

import { revalidatePath } from "next/cache";
import { getLiveActivitySnapshot, type LiveActivitySnapshot } from "@/lib/services/live-activity.service";
import {
  listStaffLiveChatThread,
  sendStaffLiveChatMessage,
  listStaffVisitorThread,
  sendStaffMessageToVisitor,
  createTicketFromVisitor,
  type CreateTicketFromVisitorInput,
} from "@/lib/services/live-chat.service";
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

export async function fetchStaffVisitorThreadAction(sessionId: string): Promise<LiveChatMessage[]> {
  return listStaffVisitorThread(sessionId);
}

export async function sendStaffVisitorMessageAction(sessionId: string, content: string): Promise<LiveChatMessage> {
  return sendStaffMessageToVisitor(sessionId, content);
}

export interface CreateTicketFromVisitorState {
  error?: string;
  ticketNumber?: string;
}

export async function createTicketFromVisitorAction(sessionId: string, input: CreateTicketFromVisitorInput): Promise<CreateTicketFromVisitorState> {
  try {
    const result = await createTicketFromVisitor(sessionId, input);
    revalidatePath("/live-activity");
    revalidatePath("/tickets");
    return { ticketNumber: result.ticketNumber };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create a ticket from this conversation." };
  }
}
