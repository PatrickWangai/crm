import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { JobCardStatus } from "@prisma/client";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import type { MaintenanceInput } from "@/lib/validation/maintenance";

const VIEW_PERMS = ["maintenance.view_all"];

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function nextJobCardNumber(): Promise<string> {
  const count = await prisma.maintenanceRequest.count();
  return `JC-${String(count + 1).padStart(6, "0")}`;
}

const requestListInclude = {
  property: { select: { id: true, name: true, code: true } },
  unit: { select: { id: true, unitNumber: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
} as const;

export interface ListMaintenanceParams {
  q?: string;
  status?: JobCardStatus;
  propertyId?: string;
  page?: number;
  pageSize?: number;
}

export async function listMaintenanceRequests(params: ListMaintenanceParams = {}) {
  await requireAnyPermission(VIEW_PERMS);

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      params.q
        ? {
            OR: [
              { jobCardNumber: { contains: params.q, mode: "insensitive" as const } },
              { issueDescription: { contains: params.q, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.status ? { status: params.status } : {},
      params.propertyId ? { propertyId: params.propertyId } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({ where, include: requestListInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.maintenanceRequest.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listMaintenanceForBoard() {
  await requireAnyPermission(VIEW_PERMS);
  return prisma.maintenanceRequest.findMany({ include: requestListInclude, orderBy: { createdAt: "desc" }, take: 300 });
}

export async function getMaintenanceDetail(id: string) {
  await requireAnyPermission(VIEW_PERMS);
  return prisma.maintenanceRequest.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, code: true } },
      unit: { select: { id: true, unitNumber: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      reportedBy: { select: { id: true, firstName: true, lastName: true } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { firstName: true, lastName: true } } } },
    },
  });
}

export async function createMaintenanceRequest(input: MaintenanceInput) {
  const actor = await requireAnyPermission(["maintenance.manage"]);
  const jobCardNumber = await nextJobCardNumber();
  const assignedToId = cleanId(input.assignedToId);

  const request = await prisma.maintenanceRequest.create({
    data: {
      jobCardNumber,
      propertyId: input.propertyId,
      unitId: cleanId(input.unitId) ?? undefined,
      issueDescription: input.issueDescription,
      priority: input.priority,
      status: assignedToId ? "ASSIGNED" : "OPEN",
      assignedToId: assignedToId ?? undefined,
      reportedById: actor.id,
      expectedCompletionDate: input.expectedCompletionDate ? new Date(input.expectedCompletionDate) : undefined,
    },
  });

  if (input.unitId) {
    await prisma.unit.update({ where: { id: input.unitId }, data: { status: "UNDER_MAINTENANCE" } }).catch(() => undefined);
  }

  await recordAudit({ userId: actor.id, action: "maintenance.created", entityType: "MaintenanceRequest", entityId: request.id, newValue: { priority: request.priority } });

  if (assignedToId) {
    await createNotification({
      userId: assignedToId,
      type: "TASK_ASSIGNED",
      title: "New maintenance job card assigned",
      message: `${request.jobCardNumber}: ${request.issueDescription.slice(0, 80)}`,
      relatedUrl: `/maintenance/${request.id}`,
    });
  }

  return request;
}

export async function updateMaintenanceStatus(id: string, status: JobCardStatus, cost?: number) {
  const actor = await requireAnyPermission(["maintenance.manage"]);
  const before = await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id } });

  const request = await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status,
      cost: cost === undefined ? undefined : cost,
      completedAt: status === "COMPLETED" && !before.completedAt ? new Date() : undefined,
    },
  });

  if ((status === "COMPLETED" || status === "CLOSED") && before.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: before.unitId } });
    if (unit && unit.status === "UNDER_MAINTENANCE") {
      await prisma.unit.update({ where: { id: before.unitId }, data: { status: unit.currentTenantId ? "OCCUPIED" : "VACANT" } });
    }
  }

  await recordAudit({
    userId: actor.id,
    action: "maintenance.status_changed",
    entityType: "MaintenanceRequest",
    entityId: id,
    previousValue: { status: before.status },
    newValue: { status },
  });

  return request;
}

export async function assignMaintenanceRequest(id: string, assignedToId: string | null) {
  const actor = await requireAnyPermission(["maintenance.manage"]);
  const before = await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id } });

  const request = await prisma.maintenanceRequest.update({
    where: { id },
    data: { assignedToId, status: assignedToId && before.status === "OPEN" ? "ASSIGNED" : undefined },
  });

  if (assignedToId && assignedToId !== before.assignedToId) {
    await createNotification({
      userId: assignedToId,
      type: "TASK_ASSIGNED",
      title: "Maintenance job card assigned to you",
      message: `${request.jobCardNumber}: ${request.issueDescription.slice(0, 80)}`,
      relatedUrl: `/maintenance/${request.id}`,
    });
  }

  await recordAudit({ userId: actor.id, action: "maintenance.assigned", entityType: "MaintenanceRequest", entityId: id, newValue: { assignedToId } });

  return request;
}

export async function deleteMaintenanceRequest(id: string) {
  const actor = await requireAnyPermission(["maintenance.manage"]);
  const documents = await prisma.document.count({ where: { maintenanceRequestId: id } });
  if (documents > 0) throw new Error(`Cannot delete: this job card has ${documents} linked document(s).`);

  await prisma.maintenanceRequest.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "maintenance.deleted", entityType: "MaintenanceRequest", entityId: id });
}
