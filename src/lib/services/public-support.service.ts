import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TicketPriority } from "@prisma/client";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import { pickSlaForTicket } from "@/lib/services/sla.service";
import { classifyTicket } from "@/lib/ai/classify-ticket";
import { isAiAssistantEnabledPublic } from "@/lib/services/ai.service";
import type { PublicSupportRequestInput, PublicTicketStatus } from "@/lib/validation/public-support";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

/**
 * Which department(s) beyond the default tickets.assign holders (CEO,
 * Customer Care) should be notified of a new public complaint — matched by
 * exact category OR by wording, since a customer might tag something
 * "Complaint"/"General Inquiry" that's actually about money or a leaking
 * pipe rather than picking the "obvious" category. Add a row here to route
 * a new department; each permissionCode should be one that department
 * actually holds (checked against ROLE_PERMISSIONS).
 */
const DEPARTMENT_ROUTES: { permissionCode: string; categories: string[]; keywords: string[] }[] = [
  {
    permissionCode: "finance.view",
    categories: ["Billing Inquiry"],
    keywords: ["invoice", "bill", "billing", "payment", "charge", "refund", "receipt", "overcharged", "rent", "arrears", "disbursement", "statement"],
  },
  {
    permissionCode: "maintenance.manage",
    categories: ["Maintenance Request"],
    keywords: ["leak", "broken", "repair", "plumbing", "electrical", "faulty", "not working", "burst", "flooding"],
  },
];

function matchedDepartmentPermissions(category: string, subject: string, description: string): string[] {
  const text = `${subject} ${description}`.toLowerCase();
  return DEPARTMENT_ROUTES.filter((route) => route.categories.includes(category) || route.keywords.some((k) => text.includes(k))).map(
    (route) => route.permissionCode,
  );
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

export interface PublicSupportSubmissionResult {
  ticketNumber: string;
  expectedResponseBy: Date | null;
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

  const notifyPermissionCodes = ["tickets.assign", ...matchedDepartmentPermissions(ticket.category, ticket.subject, ticket.description)];
  const recipients = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { rolePermissions: { some: { permission: { code: { in: notifyPermissionCodes } } } } },
    },
    select: { id: true },
    distinct: ["id"],
  });
  for (const recipient of recipients) {
    await createNotification({
      userId: recipient.id,
      type: "SYSTEM",
      title: "New request via Help & Support",
      message: `${ticket.ticketNumber}: ${ticket.subject}`,
      relatedUrl: `/tickets/${ticket.id}`,
    });
  }

  return { ticketNumber: ticket.ticketNumber, expectedResponseBy: ticket.dueAt };
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
      comments: { where: { isInternal: false }, orderBy: { createdAt: "asc" }, select: { comment: true, createdAt: true } },
    },
  });
  if (!ticket || !ticket.stakeholder.email || ticket.stakeholder.email.toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  return {
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    publicComments: ticket.comments.map((c) => ({ comment: c.comment, createdAt: c.createdAt.toISOString() })),
  };
}
