import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/rbac/guard";

export interface AiSuggestion {
  action: string;
  reason: string;
  urgency: "low" | "medium" | "high";
}

/** Whether the AI Assistant integration is enabled — DISCONNECTED hides AI features entirely. */
export async function isAiAssistantEnabled(): Promise<boolean> {
  await requireAuth();
  const config = await prisma.integrationConfig.findUnique({ where: { provider: "AI_ASSISTANT" } });
  return config?.status !== "DISCONNECTED";
}

interface LeadForSuggestion {
  status: string;
  source: string;
  createdAt: Date;
  lastInteractionAt: Date | null;
  nextFollowUpAt: Date | null;
  communications: { length: number } | unknown[];
  requirements: string | null;
}

/**
 * Deterministic, rule-based "next best action" suggestion for a lead. There is
 * no live AI_ASSISTANT credential in this environment, so this is a clearly
 * labeled heuristic standing in for what a real LLM/ML call would return —
 * swap the body for an API call once AI_ASSISTANT's IntegrationConfig status
 * moves from MOCK to CONNECTED.
 */
export function suggestNextActionForLead(lead: LeadForSuggestion): AiSuggestion {
  const daysSinceCreated = Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceContact = lead.lastInteractionAt ? Math.floor((Date.now() - lead.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const commCount = Array.isArray(lead.communications) ? lead.communications.length : 0;
  const followUpOverdue = lead.nextFollowUpAt ? lead.nextFollowUpAt.getTime() < Date.now() : false;

  if (lead.status === "CLOSED_WON" || lead.status === "CLOSED_LOST") {
    return { action: "No action needed — this lead is closed.", reason: "Pipeline stage is final.", urgency: "low" };
  }

  if (commCount === 0 && lead.status === "NEW") {
    return {
      action: "Make first contact within 24 hours",
      reason: `Captured ${daysSinceCreated === 0 ? "today" : `${daysSinceCreated} day(s) ago`} via ${lead.source.replace(/_/g, " ").toLowerCase()} with no logged interaction yet — response speed is the strongest predictor of conversion.`,
      urgency: daysSinceCreated >= 1 ? "high" : "medium",
    };
  }

  if (followUpOverdue) {
    return { action: "Call to follow up — reminder is overdue", reason: "The scheduled next follow-up date has already passed.", urgency: "high" };
  }

  if (daysSinceContact !== null && daysSinceContact >= 7 && !["RESERVATION", "NEGOTIATION"].includes(lead.status)) {
    return {
      action: "Re-engage with a check-in call or email",
      reason: `No interaction logged in ${daysSinceContact} days — leads left untouched this long are at high risk of going cold.`,
      urgency: "medium",
    };
  }

  if (lead.status === "NEGOTIATION" || lead.status === "RESERVATION") {
    return {
      action: "Prepare and send the offer/agreement documents",
      reason: "This lead is late-stage — momentum matters most here.",
      urgency: "high",
    };
  }

  if (!lead.requirements) {
    return { action: "Capture the lead's requirements", reason: "No requirements are on file yet, making it harder to match a unit.", urgency: "low" };
  }

  return { action: "Continue routine follow-up per the sales cadence", reason: "No urgent signals detected.", urgency: "low" };
}
