import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { LeadSource, LeadStatus } from "@prisma/client";
import { requireAuth, requireAnyPermission, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { LeadInput } from "@/lib/validation/lead";

const VIEW_PERMS = ["leads.view_all", "leads.view_own"];

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

function cleanStr(value?: string | null): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

async function nextLeadCode(): Promise<string> {
  const count = await prisma.lead.count();
  return `LD-${String(count + 1).padStart(6, "0")}`;
}

export interface ListLeadsParams {
  q?: string;
  status?: LeadStatus;
  source?: LeadSource;
  assignedToId?: string;
  businessUnitId?: string;
  page?: number;
  pageSize?: number;
}

const leadListInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  businessUnit: { select: { id: true, name: true, code: true } },
  _count: { select: { communications: true, documents: true } },
} as const;

export async function listLeads(params: ListLeadsParams = {}) {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "leads.view_all");

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      scopedToSelf ? { OR: [{ assignedToId: user.id }, { assignedToId: null }] } : {},
      params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" as const } },
              { lastName: { contains: params.q, mode: "insensitive" as const } },
              { email: { contains: params.q, mode: "insensitive" as const } },
              { phone: { contains: params.q, mode: "insensitive" as const } },
              { code: { contains: params.q, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.status ? { status: params.status } : {},
      params.source ? { source: params.source } : {},
      params.businessUnitId ? { businessUnitId: params.businessUnitId } : {},
      !scopedToSelf && params.assignedToId ? { assignedToId: params.assignedToId } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.lead.findMany({ where, include: leadListInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.lead.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** All leads for the Kanban board, grouped by status, respecting the same RBAC scope as listLeads. */
export async function listLeadsForBoard() {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "leads.view_all");

  const leads = await prisma.lead.findMany({
    where: scopedToSelf ? { OR: [{ assignedToId: user.id }, { assignedToId: null }] } : undefined,
    include: leadListInclude,
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return leads;
}

async function assertCanViewLead(leadId: string) {
  const user = await requireAnyPermission(VIEW_PERMS);
  if (hasPermission(user, "leads.view_all")) return user;

  const record = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } });
  if (!record || (record.assignedToId && record.assignedToId !== user.id)) {
    throw new ForbiddenError("You can only view leads assigned to you.");
  }
  return user;
}

export async function getLeadDetail(id: string) {
  await assertCanViewLead(id);

  return prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, jobTitle: true, email: true } },
      businessUnit: true,
      campaign: { select: { id: true, name: true } },
      convertedStakeholder: { select: { id: true, code: true, firstName: true, lastName: true } },
      statusHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
      communications: { orderBy: { occurredAt: "desc" }, include: { staff: { select: { firstName: true, lastName: true } } } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { firstName: true, lastName: true } } } },
      opportunities: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createLead(input: LeadInput) {
  const actor = await requireAnyPermission(["leads.create"]);
  const code = await nextLeadCode();

  const lead = await prisma.lead.create({
    data: {
      code,
      firstName: input.firstName,
      lastName: input.lastName,
      email: cleanStr(input.email),
      phone: cleanStr(input.phone),
      source: input.source,
      sourceDetail: cleanStr(input.sourceDetail),
      requirements: cleanStr(input.requirements),
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      assignedToId: cleanId(input.assignedToId) ?? undefined,
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : undefined,
      lastInteractionAt: new Date(),
      status: "NEW",
    },
  });

  await prisma.leadStatusHistory.create({
    data: { leadId: lead.id, toStatus: "NEW", changedById: actor.id, note: "Lead captured" },
  });

  await recordAudit({
    userId: actor.id,
    action: "lead.created",
    entityType: "Lead",
    entityId: lead.id,
    newValue: { firstName: lead.firstName, lastName: lead.lastName, source: lead.source },
  });

  return lead;
}

export async function updateLead(id: string, input: LeadInput) {
  const actor = await requireAnyPermission(["leads.update"]);
  const before = await prisma.lead.findUniqueOrThrow({ where: { id } });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: cleanStr(input.email),
      phone: cleanStr(input.phone),
      source: input.source,
      sourceDetail: cleanStr(input.sourceDetail),
      requirements: cleanStr(input.requirements),
      businessUnitId: cleanId(input.businessUnitId),
      assignedToId: cleanId(input.assignedToId),
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "lead.updated",
    entityType: "Lead",
    entityId: id,
    previousValue: { assignedToId: before.assignedToId, source: before.source },
    newValue: { assignedToId: lead.assignedToId, source: lead.source },
  });

  return lead;
}

export async function updateLeadStatus(id: string, status: LeadStatus, note?: string) {
  const actor = await requireAnyPermission(["leads.update"]);
  const before = await prisma.lead.findUniqueOrThrow({ where: { id } });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      status,
      lastInteractionAt: new Date(),
      convertedAt: status === "CLOSED_WON" && !before.convertedAt ? new Date() : undefined,
    },
  });

  await prisma.leadStatusHistory.create({
    data: { leadId: id, fromStatus: before.status, toStatus: status, changedById: actor.id, note: note || undefined },
  });

  await recordAudit({
    userId: actor.id,
    action: "lead.status_changed",
    entityType: "Lead",
    entityId: id,
    previousValue: { status: before.status },
    newValue: { status },
  });

  if (status === "CLOSED_WON" && !before.convertedStakeholderId) {
    await convertLeadToStakeholder(id, actor.id);
  }

  return lead;
}

async function convertLeadToStakeholder(leadId: string, actorId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.convertedStakeholderId) return;

  const count = await prisma.stakeholder.count();
  const code = `STK-${String(count + 1).padStart(6, "0")}`;

  const stakeholder = await prisma.stakeholder.create({
    data: {
      code,
      type: "CUSTOMER",
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      businessUnitId: lead.businessUnitId,
      assignedStaffId: lead.assignedToId,
      notes: lead.requirements ? `Converted from lead ${lead.code}. Requirements: ${lead.requirements}` : `Converted from lead ${lead.code}.`,
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { convertedStakeholderId: stakeholder.id } });

  await recordAudit({
    userId: actorId,
    action: "lead.converted_to_stakeholder",
    entityType: "Lead",
    entityId: leadId,
    newValue: { stakeholderId: stakeholder.id },
  });

  return stakeholder;
}

export async function assignLead(id: string, assignedToId: string | null) {
  const actor = await requireAnyPermission(["leads.assign"]);
  const before = await prisma.lead.findUniqueOrThrow({ where: { id } });

  const lead = await prisma.lead.update({ where: { id }, data: { assignedToId } });

  await recordAudit({
    userId: actor.id,
    action: "lead.assigned",
    entityType: "Lead",
    entityId: id,
    previousValue: { assignedToId: before.assignedToId },
    newValue: { assignedToId },
  });

  return lead;
}

export async function claimLead(id: string) {
  const actor = await requireAuth();
  if (!hasPermission(actor, "leads.create") && !hasPermission(actor, "leads.view_own")) {
    throw new ForbiddenError("You do not have permission to claim leads.");
  }

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
  if (lead.assignedToId) throw new Error("This lead has already been claimed.");

  const updated = await prisma.lead.update({ where: { id }, data: { assignedToId: actor.id } });
  await recordAudit({ userId: actor.id, action: "lead.claimed", entityType: "Lead", entityId: id });
  return updated;
}

export async function deleteLead(id: string) {
  const actor = await requireAnyPermission(["leads.delete"]);

  const [communications, documents, opportunities] = await Promise.all([
    prisma.communication.count({ where: { relatedLeadId: id } }),
    prisma.document.count({ where: { leadId: id } }),
    prisma.opportunity.count({ where: { leadId: id } }),
  ]);
  const blockers: string[] = [];
  if (communications) blockers.push(`${communications} communication(s)`);
  if (documents) blockers.push(`${documents} document(s)`);
  if (opportunities) blockers.push(`${opportunities} opportunity(ies)`);
  if (blockers.length > 0) {
    throw new Error(`Cannot delete: this lead has linked records — ${blockers.join(", ")}.`);
  }

  await prisma.leadStatusHistory.deleteMany({ where: { leadId: id } });
  await prisma.lead.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "lead.deleted", entityType: "Lead", entityId: id });
}
