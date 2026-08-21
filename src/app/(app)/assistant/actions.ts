"use server";

import { runAssistantCommand, type AssistantReply } from "@/lib/services/assistant.service";
import { revalidatePath } from "next/cache";

export async function runAssistantCommandAction(input: string): Promise<AssistantReply> {
  const reply = await runAssistantCommand(input);
  // Actions like forward/assign/nudge change data other pages already show —
  // cheap enough to always revalidate rather than tracking exactly which
  // command needs it.
  revalidatePath("/tickets");
  return reply;
}
