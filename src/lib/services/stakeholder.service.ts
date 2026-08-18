import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { StakeholderType } from "@prisma/client";
import { requireAuth, requireAnyPermission, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { StakeholderInput } from "@/lib/validation/stakeholder";

const VIEW_PERMS = ["stakeholders.view_all", "stakeholders.view_own"];

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

function cleanStr(value?: string | null): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

async function nextStakeholderCode(): Promise<string> {
  const count = await prisma.stakeholder.count();
  return `STK-${String(count + 1).padStart(6, "0")}`;
}

export interface ListStakeholdersParams {
  q?: string;
  type?: StakeholderType;
  businessUnitId?: string;
  assignedStaffId?: string;
  page?: number;
  pageSize?: number;
}

export async function listStakeholders(params: ListStakeholdersParams = {}) {
  const user = await requireAnyPermission(VIEW_PERMS);
  const scopedToSelf = !hasPermission(user, "stakeholders.view_all");

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      scopedToSelf ? { assignedStaffId: user.id } : {},
      params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" as const } },
              { lastName: { contains: params.q, mode: "insensitive" as const } },
              { email: { contains: params.q, mode: "insensitive" as const } },
              { phone: { contains: params.q, mode: "insensitive" as const } },
              { code: { contains: params.q, mode: "insensitive" as const } },
              { organization: { contains: params.q, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.type ? { type: params.type } : {},
      params.businessUnitId ? { businessUnitId: params.businessUnitId } : {},
      !scopedToSelf && params.assignedStaffId ? { assignedStaffId: params.assignedStaffId } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.stakeholder.findMany({
      where,
      include: {
        businessUnit: { select: { id: true, name: true, code: true } },
        assignedStaff: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { tickets: true, leads: true, documents: true, communications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stakeholder.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

async function assertCanViewStakeholder(stakeholderId: string) {
  const user = await requireAnyPermission(VIEW_PERMS);
  if (hasPermission(user, "stakeholders.view_all")) return user;

  const record = await prisma.stakeholder.findUnique({ where: { id: stakeholderId }, select: { assignedStaffId: true } });
  if (!record || record.assignedStaffId !== user.id) {
    throw new ForbiddenError("You can only view stakeholders assigned to you.");
  }
  return user;
}

export async function getStakeholderProfile(id: string) {
  await assertCanViewStakeholder(id);

  return prisma.stakeholder.findUnique({
    where: { id },
    include: {
      businessUnit: true,
      assignedStaff: { select: { id: true, firstName: true, lastName: true, jobTitle: true, email: true } },
      leads: { orderBy: { createdAt: "desc" }, take: 20 },
      tickets: { orderBy: { createdAt: "desc" }, take: 20 },
      tasks: { orderBy: { createdAt: "desc" }, take: 20, include: { assignee: { select: { firstName: true, lastName: true } } } },
      communications: {
        orderBy: { occurredAt: "desc" },
        take: 50,
        include: { staff: { select: { firstName: true, lastName: true } } },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      },
      leasesAsTenant: { include: { unit: { include: { property: true } } } },
      propertiesOwned: true,
      unitsOccupied: { include: { property: true } },
    },
  });
}

export async function getStakeholderActivity(id: string) {
  await assertCanViewStakeholder(id);
  return prisma.auditLog.findMany({
    where: { entityType: "Stakeholder", entityId: id },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function createStakeholder(input: StakeholderInput) {
  const actor = await requireAnyPermission(["stakeholders.create"]);
  const code = await nextStakeholderCode();

  const record = await prisma.stakeholder.create({
    data: {
      code,
      type: input.type,
      firstName: input.firstName,
      lastName: input.lastName,
      organization: cleanStr(input.organization),
      email: cleanStr(input.email),
      phone: cleanStr(input.phone),
      alternatePhone: cleanStr(input.alternatePhone),
      address: cleanStr(input.address),
      city: cleanStr(input.city),
      idNumber: cleanStr(input.idNumber),
      kraPin: cleanStr(input.kraPin),
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      assignedStaffId: cleanId(input.assignedStaffId) ?? undefined,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "stakeholder.created",
    entityType: "Stakeholder",
    entityId: record.id,
    newValue: { type: record.type, firstName: record.firstName, lastName: record.lastName },
  });

  return record;
}

export async function updateStakeholder(id: string, input: StakeholderInput) {
  const actor = await requireAnyPermission(["stakeholders.update"]);
  const before = await prisma.stakeholder.findUniqueOrThrow({ where: { id } });

  const record = await prisma.stakeholder.update({
    where: { id },
    data: {
      type: input.type,
      firstName: input.firstName,
      lastName: input.lastName,
      organization: cleanStr(input.organization),
      email: cleanStr(input.email),
      phone: cleanStr(input.phone),
      alternatePhone: cleanStr(input.alternatePhone),
      address: cleanStr(input.address),
      city: cleanStr(input.city),
      idNumber: cleanStr(input.idNumber),
      kraPin: cleanStr(input.kraPin),
      businessUnitId: cleanId(input.businessUnitId),
      assignedStaffId: cleanId(input.assignedStaffId),
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "stakeholder.updated",
    entityType: "Stakeholder",
    entityId: record.id,
    previousValue: { type: before.type, assignedStaffId: before.assignedStaffId },
    newValue: { type: record.type, assignedStaffId: record.assignedStaffId },
  });

  return record;
}

export async function updateStakeholderNotes(id: string, notes: string) {
  await assertCanViewStakeholder(id);
  const actor = await requireAuth();

  const record = await prisma.stakeholder.update({ where: { id }, data: { notes: notes || null } });
  await recordAudit({ userId: actor.id, action: "stakeholder.notes_updated", entityType: "Stakeholder", entityId: id });
  return record;
}

export async function deleteStakeholder(id: string) {
  const actor = await requireAnyPermission(["stakeholders.delete"]);

  const [tickets, leads, leases, communications, documents, tasks, properties, units, invoices] = await Promise.all([
    prisma.ticket.count({ where: { stakeholderId: id } }),
    prisma.lead.count({ where: { convertedStakeholderId: id } }),
    prisma.lease.count({ where: { OR: [{ tenantId: id }, { landlordId: id }] } }),
    prisma.communication.count({ where: { stakeholderId: id } }),
    prisma.document.count({ where: { stakeholderId: id } }),
    prisma.task.count({ where: { relatedStakeholderId: id } }),
    prisma.property.count({ where: { landlordId: id } }),
    prisma.unit.count({ where: { currentTenantId: id } }),
    prisma.invoice.count({ where: { stakeholderId: id } }),
  ]);
  const blockers: string[] = [];
  if (tickets) blockers.push(`${tickets} ticket(s)`);
  if (leads) blockers.push(`${leads} lead(s)`);
  if (leases) blockers.push(`${leases} lease(s)`);
  if (communications) blockers.push(`${communications} communication(s)`);
  if (documents) blockers.push(`${documents} document(s)`);
  if (tasks) blockers.push(`${tasks} task(s)`);
  if (properties) blockers.push(`${properties} owned propert(y/ies)`);
  if (units) blockers.push(`${units} occupied unit(s)`);
  if (invoices) blockers.push(`${invoices} invoice(s)`);
  if (blockers.length > 0) {
    throw new Error(`Cannot delete: this stakeholder has linked records — ${blockers.join(", ")}.`);
  }

  await prisma.stakeholder.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "stakeholder.deleted", entityType: "Stakeholder", entityId: id });
}
