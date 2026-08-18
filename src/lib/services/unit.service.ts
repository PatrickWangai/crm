import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { filterVisibleDocuments } from "@/lib/services/document.service";
import type { UnitInput } from "@/lib/validation/unit";

async function nextUnitCode(): Promise<string> {
  const count = await prisma.unit.count();
  return `UNIT-${String(count + 1).padStart(6, "0")}`;
}

export async function getUnitDetail(id: string) {
  const user = await requireAnyPermission(["units.view_all"]);

  const unit = await prisma.unit.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, code: true, city: true } },
      currentTenant: { select: { id: true, firstName: true, lastName: true, code: true } },
      leases: {
        orderBy: { startDate: "desc" },
        include: { tenant: { select: { id: true, firstName: true, lastName: true, code: true } } },
      },
      maintenanceRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!unit) return null;
  return { ...unit, documents: filterVisibleDocuments(user, unit.documents) };
}

export async function createUnit(propertyId: string, input: UnitInput) {
  const actor = await requireAnyPermission(["units.manage"]);
  const code = await nextUnitCode();

  const unit = await prisma.unit.create({
    data: {
      code,
      propertyId,
      unitNumber: input.unitNumber,
      unitType: input.unitType,
      floor: input.floor || undefined,
      bedrooms: input.bedrooms === "" || input.bedrooms === undefined ? undefined : input.bedrooms,
      bathrooms: input.bathrooms === "" || input.bathrooms === undefined ? undefined : input.bathrooms,
      sizeSqm: input.sizeSqm === "" || input.sizeSqm === undefined ? undefined : input.sizeSqm,
      rentAmount: input.rentAmount,
      status: input.status,
    },
  });

  await recordAudit({ userId: actor.id, action: "unit.created", entityType: "Unit", entityId: unit.id, newValue: { unitNumber: unit.unitNumber, propertyId } });

  return unit;
}

export async function updateUnit(id: string, input: UnitInput) {
  const actor = await requireAnyPermission(["units.manage"]);

  const unit = await prisma.unit.update({
    where: { id },
    data: {
      unitNumber: input.unitNumber,
      unitType: input.unitType,
      floor: input.floor || undefined,
      bedrooms: input.bedrooms === "" || input.bedrooms === undefined ? null : input.bedrooms,
      bathrooms: input.bathrooms === "" || input.bathrooms === undefined ? null : input.bathrooms,
      sizeSqm: input.sizeSqm === "" || input.sizeSqm === undefined ? null : input.sizeSqm,
      rentAmount: input.rentAmount,
      status: input.status,
    },
  });

  await recordAudit({ userId: actor.id, action: "unit.updated", entityType: "Unit", entityId: id, newValue: { status: unit.status } });

  return unit;
}

export async function deleteUnit(id: string) {
  const actor = await requireAnyPermission(["units.manage"]);

  const [leases, maintenanceRequests, documents] = await Promise.all([
    prisma.lease.count({ where: { unitId: id } }),
    prisma.maintenanceRequest.count({ where: { unitId: id } }),
    prisma.document.count({ where: { unitId: id } }),
  ]);
  const blockers: string[] = [];
  if (leases) blockers.push(`${leases} lease(s)`);
  if (maintenanceRequests) blockers.push(`${maintenanceRequests} maintenance request(s)`);
  if (documents) blockers.push(`${documents} document(s)`);
  if (blockers.length > 0) {
    throw new Error(`Cannot delete: this unit has linked records — ${blockers.join(", ")}.`);
  }

  await prisma.unit.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "unit.deleted", entityType: "Unit", entityId: id });
}
