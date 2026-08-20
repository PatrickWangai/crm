import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TicketPriority } from "@prisma/client";
import { recordAudit } from "@/lib/audit/log";
import { pickSlaForTicket } from "@/lib/services/sla.service";
import { classifyTicket } from "@/lib/ai/classify-ticket";
import { isAiAssistantEnabledPublic } from "@/lib/services/ai.service";
import { getSupportStage } from "@/lib/support-stage";
import { notifyNewRequest } from "@/lib/notifications/ticket-events";
import { suggestDepartment } from "@/lib/services/department-routing";
import type { PublicSupportRequestInput, PublicTicketStatus } from "@/lib/validation/public-support";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function nextTicketNumber(): Promise<string> {
  const count = await prisma.ticket.count();
  return `TKT-${String(count + 1).padStart(6, "0")}`;
}

async function nextStakeholderCode(): Promise<string> {
  const count = await prisma.stakeholder.count();
  return `STK-${String(count + 1).padStart(6, "0")}`;
}

/** Unauthenticated lookup for the public submission form's business-unit picker — no sensitive data. */
export async function listPublicBusinessUnits() {
  return prisma.businessUnit.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });
}

/**
 * Shared by the email-gated lookup (trackPublicSupportRequest), the trusted
 * bridge lookup (getTicketStatusForBridge), and the just-submitted case
 * (submitPublicSupportRequest, which already has legitimate access to the
 * ticket it just created and doesn't need either check).
 */
function buildPublicTicketStatus(ticket: {
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  businessUnit: { name: string } | null;
  createdAt: Date;
  resolvedAt: Date | null;
  dueAt: Date | null;
  comments: { comment: string; createdAt: Date }[];
}): PublicTicketStatus {
  const { stage, label } = getSupportStage(ticket.status, ticket.businessUnit?.name);
  return {
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    stage,
    stageLabel: label,
    businessUnitName: ticket.businessUnit?.name ?? null,
    createdAt: ticket.createdAt.toISOString(),
    resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    expectedResponseBy: ticket.dueAt ? ticket.dueAt.toISOString() : null,
    publicComments: ticket.comments.map((c) => ({ comment: c.comment, createdAt: c.createdAt.toISOString() })),
  };
}

export interface PublicSupportSubmissionResult {
  ticketNumber: string;
  expectedResponseBy: Date | null;
  contactEmail: string | null;
  contactPhone: string | null;
  tracking: PublicTicketStatus;
}

/**
 * Entry point for the public Help & Support portal — no auth, reachable by
 * anyone. Finds-or-creates the Stakeholder by email/phone match, then creates
 * a real Ticket through the same SLA-matching path staff-created tickets use,
 * so it lands in the ordinary Tickets queue (visible to any role holding
 * tickets.view_own/view_all, per the existing "unassigned pool" RBAC scoping)
 * rather than a parallel system. Priority is set by the deterministic AI
 * classifier from the wording alone — never by a client-submitted field —
 * so a public submitter can't self-escalate priority.
 */
export async function submitPublicSupportRequest(input: PublicSupportRequestInput): Promise<PublicSupportSubmissionResult> {
  const email = input.email || null;
  const phone = input.phone || null;
  const businessUnitId = cleanId(input.businessUnitId);

  let stakeholder = await prisma.stakeholder.findFirst({
    where: {
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter((c): c is NonNullable<typeof c> => !!c),
    },
  });

  if (!stakeholder) {
    stakeholder = await prisma.stakeholder.create({
      data: {
        code: await nextStakeholderCode(),
        type: "CUSTOMER",
        firstName: input.firstName,
        lastName: input.lastName,
        email: email ?? undefined,
        phone: phone ?? undefined,
        businessUnitId: businessUnitId ?? undefined,
      },
    });
    await recordAudit({ userId: null, action: "stakeholder.created_via_public_portal", entityType: "Stakeholder", entityId: stakeholder.id, newValue: { code: stakeholder.code } });
  }

  const aiEnabled = await isAiAssistantEnabledPublic();
  const classification = aiEnabled ? classifyTicket(input.subject, input.description) : null;
  const priority: TicketPriority = classification?.priority ?? "MEDIUM";

  const sla = await pickSlaForTicket(priority, businessUnitId);

  // Auto-assign a department only when the wording/category cleanly matches
  // exactly one (see suggestDepartment) — an ambiguous or no-match result is
  // left for Customer Care to route by hand rather than guessing wrong.
  const suggestion = suggestDepartment(input.category, input.subject, input.description);
  const suggestedDepartment =
    suggestion.status === "matched" ? await prisma.department.findFirst({ where: { code: suggestion.departments[0].code } }) : null;

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: await nextTicketNumber(),
      stakeholderId: stakeholder.id,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority,
      status: "REQUEST_LOGGED",
      businessUnitId: businessUnitId ?? undefined,
      departmentId: suggestedDepartment?.id,
      slaId: sla?.id,
      dueAt: sla ? new Date(Date.now() + sla.resolutionTimeMinutes * 60_000) : undefined,
    },
  });

  await recordAudit({
    userId: null,
    action: "ticket.created_via_public_portal",
    entityType: "Ticket",
    entityId: ticket.id,
    newValue: { subject: ticket.subject, category: ticket.category, priority: ticket.priority },
  });

  await notifyNewRequest(ticket, "Help & Support");

  const ticketWithRelations = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticket.id },
    include: {
      businessUnit: { select: { name: true } },
      comments: { where: { isInternal: false }, orderBy: { createdAt: "asc" }, select: { comment: true, createdAt: true } },
    },
  });

  return {
    ticketNumber: ticket.ticketNumber,
    expectedResponseBy: ticket.dueAt,
    contactEmail: email,
    contactPhone: phone,
    tracking: buildPublicTicketStatus(ticketWithRelations),
  };
}

/**
 * Unauthenticated status lookup. The (ticketNumber, email) pair acts as a
 * shared secret only the submitter should know — returns null on any
 * mismatch rather than distinguishing "wrong ticket" from "wrong email" so a
 * guesser can't enumerate valid ticket numbers. Only customer-visible
 * comments (isInternal: false) are ever returned.
 */
export async function trackPublicSupportRequest(ticketNumber: string, email: string): Promise<PublicTicketStatus | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      stakeholder: { select: { email: true } },
      businessUnit: { select: { name: true } },
      comments: { where: { isInternal: false }, orderBy: { createdAt: "asc" }, select: { comment: true, createdAt: true } },
    },
  });
  if (!ticket || !ticket.stakeholder.email || ticket.stakeholder.email.toLowerCase() !== email.toLowerCase()) {
    return null;
  }
  return buildPublicTicketStatus(ticket);
}

/**
 * Trusted server-to-server status lookup, no email verification — used only
 * by the API-key-protected bridge status endpoint so the standalone
 * customer app can pull live status for a ticket it already knows the
 * number of (it created it). Not exported to any public/unauthenticated
 * caller.
 */
export async function getTicketStatusForBridge(ticketNumber: string): Promise<PublicTicketStatus | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      businessUnit: { select: { name: true } },
      comments: { where: { isInternal: false }, orderBy: { createdAt: "asc" }, select: { comment: true, createdAt: true } },
    },
  });
  if (!ticket) return null;
  return buildPublicTicketStatus(ticket);
}
