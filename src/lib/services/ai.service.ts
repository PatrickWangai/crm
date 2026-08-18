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

export interface AiHistorySummary {
  summary: string;
  highlights: string[];
}

interface StakeholderForSummary {
  firstName: string;
  lastName: string;
  type: string;
  createdAt: Date;
  communications: { channel: string; direction: string; occurredAt: Date }[];
  tickets: { status: string }[];
  tasks: { status: string }[];
  leasesAsTenant: { status: string }[];
  leads: { status: string }[];
}

/**
 * Deterministic, rule-based narrative summary of a stakeholder's history —
 * stands in for what a real LLM summarizer would generate from the same
 * records. Swap the body for an API call once AI_ASSISTANT moves from MOCK
 * to CONNECTED.
 */
export function summarizeStakeholderHistory(s: StakeholderForSummary): AiHistorySummary {
  const tenureDays = Math.floor((Date.now() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const openTickets = s.tickets.filter((t) => !["COMPLETED", "CLOSED"].includes(t.status)).length;
  const activeLeases = s.leasesAsTenant.filter((l) => l.status === "ACTIVE").length;
  const pendingTasks = s.tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
  const lastContact = s.communications[0];
  const outboundCount = s.communications.filter((c) => c.direction === "OUTBOUND").length;
  const inboundCount = s.communications.filter((c) => c.direction === "INBOUND").length;
  const openLeads = s.leads.filter((l) => !["CLOSED_WON", "CLOSED_LOST"].includes(l.status)).length;

  const parts: string[] = [];
  parts.push(`${s.firstName} has been a ${s.type.toLowerCase()} for ${tenureDays < 1 ? "less than a day" : `${tenureDays} day(s)`}.`);
  if (activeLeases > 0) parts.push(`Currently holds ${activeLeases} active lease(s).`);
  if (s.communications.length > 0) {
    parts.push(`${s.communications.length} logged interaction(s) (${inboundCount} inbound, ${outboundCount} outbound)${lastContact ? `, most recently by ${lastContact.channel.toLowerCase()}` : ""}.`);
  } else {
    parts.push("No interactions logged yet.");
  }
  if (openTickets > 0) parts.push(`${openTickets} ticket(s) currently open.`);
  if (openLeads > 0) parts.push(`${openLeads} lead(s) still in an active pipeline stage.`);
  if (pendingTasks > 0) parts.push(`${pendingTasks} task(s) pending against this profile.`);

  const highlights: string[] = [];
  if (openTickets > 0) highlights.push(`${openTickets} open ticket(s) need attention`);
  if (pendingTasks > 0) highlights.push(`${pendingTasks} pending task(s)`);
  if (s.communications.length === 0) highlights.push("No contact history yet");
  if (highlights.length === 0) highlights.push("No open items — profile is up to date");

  return { summary: parts.join(" "), highlights };
}

export interface AiReportInsights {
  summary: string[];
  forecast: { label: string; value: string } | null;
}

interface ReportDataForSummary {
  pipeline: { total: number; won: number; lost: number; winRate: number };
  ticketSla: { compliance: number | null; openBreached: number };
  occupancy: { occupancyRate: number; total: number };
  finance: { totalCollected: number; outstanding: number; overdueCount: number };
  maintenance: { avgCompletionDays: number | null };
  monthlyRevenue: { month: string; total: number }[];
}

/**
 * Deterministic narrative summary of the reports dashboard, plus a simple
 * trailing-average trend forecast for next month's collections. Stands in
 * for a real LLM summary + forecasting model. Swap once AI_ASSISTANT moves
 * from MOCK to CONNECTED.
 */
export function summarizeReportInsights(data: ReportDataForSummary): AiReportInsights {
  const summary: string[] = [];

  summary.push(
    data.pipeline.total > 0
      ? `Sales pipeline holds ${data.pipeline.total} lead(s) with a ${data.pipeline.winRate}% win rate (${data.pipeline.won} won, ${data.pipeline.lost} lost).`
      : "No leads captured yet.",
  );

  summary.push(
    data.ticketSla.compliance !== null
      ? `Ticket SLA compliance is ${data.ticketSla.compliance}%${data.ticketSla.openBreached > 0 ? `, with ${data.ticketSla.openBreached} ticket(s) currently breached.` : "."}`
      : "No resolved tickets yet to measure SLA compliance.",
  );

  summary.push(`Portfolio occupancy is ${data.occupancy.occupancyRate}% across ${data.occupancy.total} unit(s).`);

  summary.push(
    data.finance.outstanding > 0
      ? `${data.finance.overdueCount} invoice(s) are overdue against KES ${Math.round(data.finance.outstanding).toLocaleString()} outstanding.`
      : "No outstanding invoice balance.",
  );

  if (data.maintenance.avgCompletionDays !== null) {
    summary.push(`Maintenance job cards complete in ${data.maintenance.avgCompletionDays} day(s) on average.`);
  }

  let forecast: AiReportInsights["forecast"] = null;
  const points = data.monthlyRevenue.filter((m) => m.total > 0);
  if (points.length >= 2) {
    const deltas = points.slice(1).map((p, i) => p.total - points[i].total);
    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const lastValue = points[points.length - 1].total;
    const projected = Math.max(0, Math.round(lastValue + avgDelta));
    forecast = { label: "Projected next month collections", value: `KES ${projected.toLocaleString()}` };
  }

  return { summary, forecast };
}

interface TicketForReply {
  subject: string;
  category: string;
  priority: string;
  stakeholderFirstName: string;
  latestPublicComment: string | null;
}

/**
 * Deterministic, template-based reply suggestion for a ticket — stands in
 * for what a real LLM drafting assistant would generate from the ticket
 * context. Swap once AI_ASSISTANT moves from MOCK to CONNECTED.
 */
export function suggestTicketReply(ticket: TicketForReply): { text: string } {
  const greeting = `Hi ${ticket.stakeholderFirstName},`;
  let body: string;

  if (ticket.latestPublicComment) {
    body = `Thank you for the update. We're continuing to work on "${ticket.subject}" and will follow up as soon as there's progress to share.`;
  } else if (ticket.category === "Billing Inquiry") {
    body = `Thank you for reaching out about "${ticket.subject}". We're reviewing your account and will get back to you with a clear breakdown shortly.`;
  } else if (ticket.category === "Maintenance Request") {
    body = `Thank you for reporting this. We've logged "${ticket.subject}" and a technician will be assigned ${ticket.priority === "URGENT" || ticket.priority === "HIGH" ? "as a priority" : "shortly"}.`;
  } else if (ticket.category === "Complaint") {
    body = `We're sorry to hear about this and take it seriously. We're looking into "${ticket.subject}" and will update you with next steps soon.`;
  } else {
    body = `Thank you for contacting us about "${ticket.subject}". We're looking into this and will follow up shortly.`;
  }

  return { text: `${greeting}\n\n${body}\n\nRegards,\nMasterways Team` };
}
