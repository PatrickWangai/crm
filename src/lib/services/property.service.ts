import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { PropertyInput } from "@/lib/validation/property";

const VIEW_PERMS = ["properties.view_all"];

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function nextPropertyCode(): Promise<string> {
  const count = await prisma.property.count();
  return `PRP-${String(count + 1).padStart(4, "0")}`;
}

export interface ListPropertiesParams {
  q?: string;
  propertyType?: string;
  businessUnitId?: string;
  page?: number;
  pageSize?: number;
}

export async function listProperties(params: ListPropertiesParams = {}) {
  await requireAnyPermission(VIEW_PERMS);

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" as const } },
              { code: { contains: params.q, mode: "insensitive" as const } },
              { city: { contains: params.q, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.propertyType ? { propertyType: params.propertyType } : {},
      params.businessUnitId ? { businessUnitId: params.businessUnitId } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        businessUnit: { select: { id: true, name: true, code: true } },
        landlord: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { units: true, maintenanceRequests: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPropertyDetail(id: string) {
  await requireAnyPermission(VIEW_PERMS);

  return prisma.property.findUnique({
    where: { id },
    include: {
      businessUnit: true,
      landlord: { select: { id: true, firstName: true, lastName: true, code: true, phone: true, email: true } },
      units: {
        orderBy: { unitNumber: "asc" },
        include: { currentTenant: { select: { id: true, firstName: true, lastName: true } } },
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { unit: { select: { unitNumber: true } }, assignedTo: { select: { firstName: true, lastName: true } } },
      },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { firstName: true, lastName: true } } } },
      tasks: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createProperty(input: PropertyInput) {
  const actor = await requireAnyPermission(["properties.manage"]);
  const code = await nextPropertyCode();

  const property = await prisma.property.create({
    data: {
      code,
      name: input.name,
      propertyType: input.propertyType,
      address: input.address || undefined,
      city: input.city || undefined,
      region: input.region || undefined,
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      landlordId: cleanId(input.landlordId) ?? undefined,
    },
  });

  await recordAudit({ userId: actor.id, action: "property.created", entityType: "Property", entityId: property.id, newValue: { name: property.name } });

  return property;
}

export async function updateProperty(id: string, input: PropertyInput) {
  const actor = await requireAnyPermission(["properties.manage"]);

  const property = await prisma.property.update({
    where: { id },
    data: {
      name: input.name,
      propertyType: input.propertyType,
      address: input.address || undefined,
      city: input.city || undefined,
      region: input.region || undefined,
      businessUnitId: cleanId(input.businessUnitId),
      landlordId: cleanId(input.landlordId),
    },
  });

  await recordAudit({ userId: actor.id, action: "property.updated", entityType: "Property", entityId: id, newValue: { name: property.name } });

  return property;
}

export async function deleteProperty(id: string) {
  const actor = await requireAnyPermission(["properties.manage"]);

  const [units, maintenanceRequests, documents, leads, opportunities, tasks] = await Promise.all([
    prisma.unit.count({ where: { propertyId: id } }),
    prisma.maintenanceRequest.count({ where: { propertyId: id } }),
    prisma.document.count({ where: { propertyId: id } }),
    prisma.lead.count({ where: { interestedPropertyId: id } }),
    prisma.opportunity.count({ where: { propertyId: id } }),
    prisma.task.count({ where: { relatedPropertyId: id } }),
  ]);
  const blockers: string[] = [];
  if (units) blockers.push(`${units} unit(s)`);
  if (maintenanceRequests) blockers.push(`${maintenanceRequests} maintenance request(s)`);
  if (documents) blockers.push(`${documents} document(s)`);
  if (leads) blockers.push(`${leads} linked lead(s)`);
  if (opportunities) blockers.push(`${opportunities} linked opportunity(ies)`);
  if (tasks) blockers.push(`${tasks} task(s)`);
  if (blockers.length > 0) {
    throw new Error(`Cannot delete: this property has linked records — ${blockers.join(", ")}.`);
  }

  await prisma.property.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "property.deleted", entityType: "Property", entityId: id });
}
