import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { LeaseStatus } from "@prisma/client";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import { isWorkflowActive } from "@/lib/services/workflow.service";
import { filterVisibleDocuments } from "@/lib/services/document.service";
import type { LeaseInput } from "@/lib/validation/lease";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function nextLeaseCode(): Promise<string> {
  const count = await prisma.lease.count();
  return `LSE-${String(count + 1).padStart(6, "0")}`;
}

export interface ListLeasesParams {
  q?: string;
  status?: LeaseStatus;
  page?: number;
  pageSize?: number;
}

export async function listLeases(params: ListLeasesParams = {}) {
  await requireAnyPermission(["leases.view_all"]);

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      params.q
        ? {
            OR: [
              { code: { contains: params.q, mode: "insensitive" as const } },
              { tenant: { firstName: { contains: params.q, mode: "insensitive" as const } } },
              { tenant: { lastName: { contains: params.q, mode: "insensitive" as const } } },
              { unit: { unitNumber: { contains: params.q, mode: "insensitive" as const } } },
            ],
          }
        : {},
      params.status ? { status: params.status } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.lease.findMany({
      where,
      include: {
        unit: { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
        tenant: { select: { id: true, firstName: true, lastName: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lease.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getLeaseDetail(id: string) {
  const user = await requireAnyPermission(["leases.view_all"]);

  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
      unit: { include: { property: { select: { id: true, name: true, code: true } } } },
      tenant: { select: { id: true, firstName: true, lastName: true, code: true, email: true, phone: true } },
      landlord: { select: { id: true, firstName: true, lastName: true, code: true } },
      invoices: { orderBy: { createdAt: "desc" }, include: { payments: true } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!lease) return null;
  return { ...lease, documents: filterVisibleDocuments(user, lease.documents) };
}

export async function createLease(input: LeaseInput) {
  const actor = await requireAnyPermission(["leases.manage"]);

  const activeConflict = await prisma.lease.findFirst({ where: { unitId: input.unitId, status: "ACTIVE" } });
  if (activeConflict) throw new Error("This unit already has an active lease. Terminate or end it before creating a new one.");

  const code = await nextLeaseCode();
  const landlordId = cleanId(input.landlordId);

  const lease = await prisma.$transaction(async (tx) => {
    const created = await tx.lease.create({
      data: {
        code,
        unitId: input.unitId,
        tenantId: input.tenantId,
        landlordId: landlordId ?? undefined,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        rentAmount: input.rentAmount,
        depositAmount: input.depositAmount === "" || input.depositAmount === undefined ? undefined : input.depositAmount,
        status: "ACTIVE",
      },
    });
    await tx.unit.update({ where: { id: input.unitId }, data: { status: "OCCUPIED", currentTenantId: input.tenantId } });
    return created;
  });

  await recordAudit({ userId: actor.id, action: "lease.created", entityType: "Lease", entityId: lease.id, newValue: { unitId: lease.unitId, tenantId: lease.tenantId } });

  return lease;
}

export async function updateLease(id: string, input: LeaseInput) {
  const actor = await requireAnyPermission(["leases.manage"]);

  const lease = await prisma.lease.update({
    where: { id },
    data: {
      tenantId: input.tenantId,
      landlordId: cleanId(input.landlordId),
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      rentAmount: input.rentAmount,
      depositAmount: input.depositAmount === "" || input.depositAmount === undefined ? null : input.depositAmount,
    },
  });

  await recordAudit({ userId: actor.id, action: "lease.updated", entityType: "Lease", entityId: id });

  return lease;
}

export async function updateLeaseStatus(id: string, status: LeaseStatus) {
  const actor = await requireAnyPermission(["leases.manage"]);
  const lease = await prisma.lease.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.lease.update({ where: { id }, data: { status } });

    if (status === "TERMINATED" || status === "EXPIRED") {
      const unit = await tx.unit.findUnique({ where: { id: lease.unitId } });
      if (unit?.currentTenantId === lease.tenantId) {
        await tx.unit.update({ where: { id: lease.unitId }, data: { status: "VACANT", currentTenantId: null } });
      }
    } else if (status === "ACTIVE") {
      await tx.unit.update({ where: { id: lease.unitId }, data: { status: "OCCUPIED", currentTenantId: lease.tenantId } });
    }

    return result;
  });

  await recordAudit({
    userId: actor.id,
    action: "lease.status_changed",
    entityType: "Lease",
    entityId: id,
    previousValue: { status: lease.status },
    newValue: { status },
  });

  if (status === "PENDING_RENEWAL" && !lease.renewalReminderSentAt) {
    await prisma.lease.update({ where: { id }, data: { renewalReminderSentAt: new Date() } });
  }

  return updated;
}

/** Flags leases expiring within the given number of days as PENDING_RENEWAL and notifies property managers. Intended for a scheduled job; safe to call repeatedly. */
export async function flagExpiringLeases(withinDays = 30) {
  await requireAnyPermission(["leases.manage"]);
  if (!(await isWorkflowActive("lease.renewal_check"))) return 0;

  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  const expiring = await prisma.lease.findMany({
    where: { status: "ACTIVE", endDate: { lte: cutoff }, renewalReminderSentAt: null },
    include: { unit: { include: { property: true } } },
  });

  const managers = await prisma.user.findMany({
    where: { role: { rolePermissions: { some: { permission: { code: "leases.manage" } } } }, status: "ACTIVE" },
    select: { id: true },
  });

  for (const lease of expiring) {
    await prisma.lease.update({ where: { id: lease.id }, data: { renewalReminderSentAt: new Date() } });

    const taskCode = `TSK-${String((await prisma.task.count()) + 1).padStart(6, "0")}`;
    await prisma.task.create({
      data: {
        code: taskCode,
        title: `Renew or terminate lease ${lease.code}`,
        description: `Unit ${lease.unit.unitNumber} at ${lease.unit.property.name} — lease expires ${lease.endDate.toLocaleDateString()}. Confirm renewal terms with the tenant or plan handover.`,
        priority: "HIGH",
        dueDate: lease.endDate,
        relatedPropertyId: lease.unit.propertyId,
      },
    });

    for (const manager of managers) {
      await createNotification({
        userId: manager.id,
        type: "LEASE_EXPIRING",
        title: "Lease expiring soon",
        message: `${lease.code} (Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}) expires ${lease.endDate.toLocaleDateString()}.`,
        relatedUrl: `/leases/${lease.id}`,
      });
    }
  }

  return expiring.length;
}
