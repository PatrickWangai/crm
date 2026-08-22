import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { createNotification } from "@/lib/services/notification.service";
import { getDepartmentMembers, resolveCareDepartment } from "@/lib/services/department-routing";
import { sendEmail } from "@/lib/email/resend";
import { emailShell } from "@/lib/email/templates";
import type { SendCustomerChatMessageInput, LiveChatMessage } from "@/lib/validation/public-support";

/**
 * Live back-and-forth once a ticket is assigned to a department — a
 * separate Communication channel (LIVE_CHAT) from both TicketComment
 * (staff-only internal/customer-visible notes) and the CHATBOT transcript
 * (the pre-ticket bot conversation), so all three stay distinguishable in
 * a ticket's History.
 */

function toThreadMessage(row: { id: string; direction: string; content: string; occurredAt: Date }): LiveChatMessage {
  return { id: row.id, from: row.direction === "INBOUND" ? "customer" : "staff", content: row.content, occurredAt: row.occurredAt.toISOString() };
}

/** Staff view — any permission that lets someone see the ticket at all is enough to read/send on its live chat. */
export async function listStaffLiveChatThread(ticketId: string): Promise<LiveChatMessage[]> {
  await requireAnyPermission(["tickets.view_all", "tickets.view_own"]);
  const rows = await prisma.communication.findMany({
    where: { relatedTicketId: ticketId, channel: "LIVE_CHAT" },
    orderBy: { occurredAt: "asc" },
  });
  return rows.map(toThreadMessage);
}

export async function sendStaffLiveChatMessage(ticketId: string, content: string): Promise<LiveChatMessage> {
  const actor = await requireAnyPermission(["tickets.update"]);
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { id: true, stakeholderId: true, ticketNumber: true, subject: true } });

  const message = await prisma.communication.create({
    data: {
      channel: "LIVE_CHAT",
      direction: "OUTBOUND",
      content: content.trim(),
      staffId: actor.id,
      stakeholderId: ticket.stakeholderId,
      relatedTicketId: ticket.id,
      occurredAt: new Date(),
    },
  });

  return toThreadMessage(message);
}

/** Unauthenticated (ticketNumber, email) verification — same shared-secret pairing as the public tracker. Returns null on any mismatch. */
async function verifyPublicTicketAccess(ticketNumber: string, email: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    select: { id: true, stakeholderId: true, departmentId: true, subject: true, ticketNumber: true, stakeholder: { select: { email: true } } },
  });
  if (!ticket || !ticket.stakeholder.email || ticket.stakeholder.email.toLowerCase() !== email.toLowerCase()) return null;
  return ticket;
}

export async function listPublicLiveChatThread(ticketNumber: string, email: string): Promise<LiveChatMessage[] | null> {
  const ticket = await verifyPublicTicketAccess(ticketNumber, email);
  if (!ticket) return null;
  const rows = await prisma.communication.findMany({
    where: { relatedTicketId: ticket.id, channel: "LIVE_CHAT" },
    orderBy: { occurredAt: "asc" },
  });
  return rows.map(toThreadMessage);
}

/**
 * Customer sends a message into an already-assigned ticket. Notifies the
 * department the ticket is currently in (same "whole department, not just
 * whoever's assigned" pattern as a new request landing) so whoever's
 * available can pick it up — mirrors notifyNewRequest in ticket-events.ts.
 */
export async function sendCustomerLiveChatMessage(input: SendCustomerChatMessageInput): Promise<LiveChatMessage | null> {
  const ticket = await verifyPublicTicketAccess(input.ticketNumber, input.email);
  if (!ticket) return null;

  const message = await prisma.communication.create({
    data: {
      channel: "LIVE_CHAT",
      direction: "INBOUND",
      content: input.content,
      stakeholderId: ticket.stakeholderId,
      relatedTicketId: ticket.id,
      occurredAt: new Date(),
    },
  });

  if (ticket.departmentId) {
    const members = await getDepartmentMembers(ticket.departmentId);
    await Promise.all(
      members.map(async (m) => {
        await createNotification({
          userId: m.id,
          type: "SYSTEM",
          title: "New message from a customer",
          message: `${ticket.ticketNumber}: ${ticket.subject}`,
          relatedUrl: `/tickets/${ticket.id}`,
        });
        if (m.email) {
          await sendEmail({
            to: m.email,
            subject: `New message: ${ticket.ticketNumber}`,
            html: emailShell(
              "A customer just sent a message",
              `<p style="color:#475467; font-size:14px; line-height:1.5;"><strong>${ticket.ticketNumber}</strong> — ${ticket.subject}<br/><br/>"${input.content}"</p>`,
              `/tickets/${ticket.id}`,
              "Reply",
            ),
          });
        }
      }),
    );
  }

  return toThreadMessage(message);
}

/**
 * Pre-ticket live chat — talking to a visitor who's on the help page right
 * now but hasn't created a ticket yet (or ever will). Keyed by the same
 * anonymous sessionId presence-tracker.tsx already generates, not a ticket,
 * since one doesn't exist yet. Reuses the same LiveChatMessage shape as the
 * ticket-based thread above (visitor -> "customer") so the UI components
 * don't need a parallel type.
 */

function toVisitorThreadMessage(row: { id: string; from: string; content: string; createdAt: Date }): LiveChatMessage {
  return { id: row.id, from: row.from === "visitor" ? "customer" : "staff", content: row.content, occurredAt: row.createdAt.toISOString() };
}

export async function listStaffVisitorThread(sessionId: string): Promise<LiveChatMessage[]> {
  await requireAnyPermission(["live_activity.view"]);
  const rows = await prisma.visitorMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } });
  return rows.map(toVisitorThreadMessage);
}

export async function sendStaffMessageToVisitor(sessionId: string, content: string): Promise<LiveChatMessage> {
  await requireAnyPermission(["live_activity.view"]);
  const message = await prisma.visitorMessage.create({ data: { sessionId, from: "staff", content: content.trim() } });
  return toVisitorThreadMessage(message);
}

export async function listPublicVisitorThread(sessionId: string): Promise<LiveChatMessage[]> {
  const rows = await prisma.visitorMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } });
  return rows.map(toVisitorThreadMessage);
}

/** Visitor sends a message before any ticket exists — notifies Customer Care – Real Estate, the same default front desk anonymous/undifferentiated traffic already lands on elsewhere (see resolveCareDepartment). */
export async function sendPublicVisitorMessage(sessionId: string, content: string): Promise<LiveChatMessage> {
  const message = await prisma.visitorMessage.create({ data: { sessionId, from: "visitor", content } });

  const care = await resolveCareDepartment(null);
  const members = await getDepartmentMembers(care.id);
  await Promise.all(
    members.map((m) =>
      createNotification({
        userId: m.id,
        type: "SYSTEM",
        title: "A visitor is messaging on the help page",
        message: content.length > 80 ? `${content.slice(0, 80)}…` : content,
        relatedUrl: "/live-activity",
      }),
    ),
  );

  return toVisitorThreadMessage(message);
}

export interface CreateTicketFromVisitorInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  category: string;
  subject: string;
  description: string;
}

/**
 * "Create Ticket" from a live pre-ticket conversation — staff fills in
 * whatever contact details the visitor has given so far (they may not have
 * shared any yet). Carries the existing VisitorMessage transcript over into
 * the new ticket's Communication log (as LIVE_CHAT rows, same channel the
 * post-ticket thread already uses) so nothing is lost, then points the
 * visitor's HelpPageVisit row at the new ticket — from here on, their
 * conversation continues through the normal ticket-based live chat.
 */
export async function createTicketFromVisitor(sessionId: string, input: CreateTicketFromVisitorInput) {
  const actor = await requireAnyPermission(["tickets.assign"]);
  const { submitPublicSupportRequest } = await import("@/lib/services/public-support.service");
  const { publicSupportRequestSchema } = await import("@/lib/validation/public-support");

  const parsed = publicSupportRequestSchema.parse({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    businessUnitId: "",
    category: input.category,
    subject: input.subject,
    description: input.description,
  });

  const result = await submitPublicSupportRequest(parsed);

  const transcript = await prisma.visitorMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } });
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: result.ticketId }, select: { stakeholderId: true } });

  if (transcript.length > 0) {
    await prisma.communication.createMany({
      data: transcript.map((m) => ({
        channel: "LIVE_CHAT" as const,
        direction: m.from === "visitor" ? ("INBOUND" as const) : ("OUTBOUND" as const),
        content: m.content,
        staffId: m.from === "staff" ? actor.id : undefined,
        stakeholderId: ticket.stakeholderId,
        relatedTicketId: result.ticketId,
        occurredAt: m.createdAt,
      })),
    });
    await prisma.visitorMessage.deleteMany({ where: { sessionId } });
  }

  await prisma.helpPageVisit.updateMany({ where: { sessionId }, data: { ticketNumber: result.ticketNumber } });

  return result;
}
