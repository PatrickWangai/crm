import "server-only";
import { sendEmail } from "@/lib/email/resend";
import { customerEmailShell, APP_URL } from "@/lib/email/templates";
import type { SupportStage } from "@/lib/support-stage";

interface TrackedTicket {
  ticketNumber: string;
  subject: string;
  dueAt: Date | null;
}

interface TicketStakeholder {
  firstName: string;
  email: string | null;
}

const STAGE_LABELS: [string, string, string] = ["Received", "Being worked on", "Done"];

/** Same three steps as the public tracker page, rendered as plain text so it holds up across email clients. */
function trackerHtml(stage: SupportStage): string {
  const steps = STAGE_LABELS.map((label, i) => {
    const stepStage = (i + 1) as SupportStage;
    const done = stage > stepStage;
    const current = stage === stepStage;
    const color = current ? "#1d4e89" : done ? "#12b76a" : "#98a2b3";
    return `<span style="color:${color}; font-weight:${current ? 600 : 400};">${done ? "&#10003; " : ""}${label}</span>`;
  });
  return `<p style="font-size:13px; margin:12px 0;">${steps.join('<span style="color:#d0d5dd; margin:0 6px;">&rarr;</span>')}</p>`;
}

function deadlineHtml(dueAt: Date | null): string {
  if (!dueAt) return "";
  return `<p style="font-size:13px; color:#475467; margin:4px 0 0;">Expected response by ${dueAt.toLocaleString()}.</p>`;
}

/** Deep-links straight into the public tracker with the lookup pre-filled and auto-submitted (see track-request-form.tsx) — the customer clicks and lands on their live status, no retyping. */
function trackingUrl(ticketNumber: string, email: string): string {
  const params = new URLSearchParams({ tab: "track", ticketNumber, email });
  return `${APP_URL}/help?${params.toString()}`;
}

/**
 * Fires once, right after a ticket lands (staff-logged or public portal),
 * so the customer has an immediate confirmation with their reference number
 * and the same three-step tracker they'd see if they looked it up
 * themselves — pushed instead of requiring them to go check.
 */
export async function notifyCustomerReceived(ticket: TrackedTicket, stakeholder: TicketStakeholder) {
  if (!stakeholder.email) return;
  await sendEmail({
    to: stakeholder.email,
    subject: `We've got your request — ${ticket.ticketNumber}`,
    html: customerEmailShell(
      `Hi ${stakeholder.firstName}, we've received your request`,
      `<p style="color:#475467; font-size:14px; line-height:1.6;">${ticket.subject}</p>${trackerHtml(1)}${deadlineHtml(ticket.dueAt)}`,
      ticket.ticketNumber,
      trackingUrl(ticket.ticketNumber, stakeholder.email),
    ),
  });
}

/**
 * Fires whenever the ticket's customer-visible stage actually advances
 * (Received -> Being worked on -> Done) — see support-stage.ts for exactly
 * which status changes count. Never fires on a same-stage or backward move
 * (e.g. REQUEST_LOGGED and ASSIGNED both read as "Received"), so the
 * customer isn't emailed for internal moves that don't change what they'd
 * see on their tracker.
 */
export async function notifyCustomerStageChanged(ticket: TrackedTicket, stakeholder: TicketStakeholder, stage: SupportStage) {
  if (!stakeholder.email) return;
  const done = stage === 3;
  await sendEmail({
    to: stakeholder.email,
    subject: `${done ? "Completed" : "Update"}: ${ticket.ticketNumber} — ${ticket.subject}`,
    html: customerEmailShell(
      `Hi ${stakeholder.firstName}, ${done ? "your request is done" : "there's an update on your request"}`,
      `<p style="color:#475467; font-size:14px; line-height:1.6;">${ticket.subject}</p>${trackerHtml(stage)}${done ? "" : deadlineHtml(ticket.dueAt)}`,
      ticket.ticketNumber,
      trackingUrl(ticket.ticketNumber, stakeholder.email),
    ),
  });
}
