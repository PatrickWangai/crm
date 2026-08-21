import { HELP_TOPICS, type HelpTopic } from "./help-topics";

export type AssistantIntent =
  | { type: "forward_ticket"; ticketNumber: string; departmentQuery: string }
  | { type: "assign_ticket"; ticketNumber: string; personQuery: string }
  | { type: "nudge_ticket"; ticketNumber: string }
  | { type: "lookup_ticket"; ticketNumber: string }
  | { type: "my_tickets" }
  | { type: "my_tasks" }
  | { type: "sla_risk_summary" }
  | { type: "help"; topic: HelpTopic | null }
  | { type: "unknown" };

const TICKET_NUMBER_RE = /\b(TKT-[A-Za-z0-9-]+)\b/i;

/**
 * Deterministic command parser for the internal staff assistant — pattern
 * matching, not a live AI model, same philosophy as classify-ticket.ts and
 * the customer-facing chatbot's own stage machine. Every action intent
 * this produces still goes through the real service functions (see
 * assistant.service.ts), which enforce the same RBAC checks as the normal
 * UI — this parser only decides *what* the user is asking for, never
 * whether they're allowed to do it.
 */
export function parseAssistantIntent(raw: string): AssistantIntent {
  const text = raw.trim();
  const lower = text.toLowerCase();

  const forwardMatch = text.match(/(?:forward|send)\s+(?:ticket\s+)?(TKT-[A-Za-z0-9-]+)\s+to\s+(.+)/i);
  if (forwardMatch) return { type: "forward_ticket", ticketNumber: forwardMatch[1].toUpperCase(), departmentQuery: forwardMatch[2].trim() };

  const assignMatch = text.match(/assign\s+(?:ticket\s+)?(TKT-[A-Za-z0-9-]+)\s+to\s+(.+)/i);
  if (assignMatch) return { type: "assign_ticket", ticketNumber: assignMatch[1].toUpperCase(), personQuery: assignMatch[2].trim() };

  const nudgeMatch = text.match(/(?:nudge|remind|escalate|push)\s+(?:ticket\s+)?(TKT-[A-Za-z0-9-]+)/i);
  if (nudgeMatch) return { type: "nudge_ticket", ticketNumber: nudgeMatch[1].toUpperCase() };

  if (/\bmy\s+(?:open\s+)?tickets?\b/i.test(lower)) return { type: "my_tickets" };
  if (/\bmy\s+tasks?\b/i.test(lower)) return { type: "my_tasks" };

  if (/\b(at risk|near due|approaching (?:due|deadline)|about to breach|sla risk)\b/i.test(lower)) return { type: "sla_risk_summary" };

  // A bare ticket number with none of the action verbs above is treated as a lookup.
  const bareTicket = text.match(TICKET_NUMBER_RE);
  if (bareTicket) return { type: "lookup_ticket", ticketNumber: bareTicket[1].toUpperCase() };

  const topic = matchHelpTopic(lower);
  if (topic) return { type: "help", topic };

  if (/^(hi|hello|hey|help)\b/i.test(lower)) return { type: "help", topic: null };

  return { type: "unknown" };
}

function matchHelpTopic(lower: string): HelpTopic | null {
  let best: { topic: HelpTopic; score: number } | null = null;
  for (const topic of HELP_TOPICS) {
    const score = topic.keywords.reduce((sum, k) => (lower.includes(k) ? sum + 1 : sum), 0);
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }
  return best?.topic ?? null;
}
