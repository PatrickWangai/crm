import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TicketPriority } from "@prisma/client";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { SlaInput } from "@/lib/validation/sla";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

function cleanStr(value?: string | null): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

export async function listSLAs() {
  await requireAnyPermission(["settings.manage"]);
  return prisma.sLA.findMany({
    include: { businessUnit: { select: { id: true, name: true } }, _count: { select: { tickets: true } } },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });
}

/**
 * Picks the SLA policy to apply to a new ticket: prefers an active policy
 * scoped to the ticket's business unit, falling back to a global (no
 * business unit) policy for the same priority.
 */
export async function pickSlaForTicket(priority: TicketPriority, businessUnitId: string | null) {
  const candidates = await prisma.sLA.findMany({
    where: { priority, isActive: true, OR: [{ businessUnitId }, { businessUnitId: null }] },
  });
  if (candidates.length === 0) return null;
  return candidates.find((c) => c.businessUnitId === businessUnitId) ?? candidates.find((c) => c.businessUnitId === null) ?? candidates[0];
}

export async function createSLA(input: SlaInput) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const record = await prisma.sLA.create({
    data: {
      name: input.name,
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      category: cleanStr(input.category),
      priority: input.priority,
      responseTimeMinutes: input.responseTimeMinutes,
      resolutionTimeMinutes: input.resolutionTimeMinutes,
      isActive: input.isActive === "true",
    },
  });
  await recordAudit({ userId: actor.id, action: "sla.created", entityType: "SLA", entityId: record.id, newValue: { name: record.name, priority: record.priority } });
  return record;
}

export async function updateSLA(id: string, input: SlaInput) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const record = await prisma.sLA.update({
    where: { id },
    data: {
      name: input.name,
      businessUnitId: cleanId(input.businessUnitId),
      category: cleanStr(input.category),
      priority: input.priority,
      responseTimeMinutes: input.responseTimeMinutes,
      resolutionTimeMinutes: input.resolutionTimeMinutes,
      isActive: input.isActive === "true",
    },
  });
  await recordAudit({ userId: actor.id, action: "sla.updated", entityType: "SLA", entityId: id, newValue: { name: record.name, priority: record.priority } });
  return record;
}

export async function deleteSLA(id: string) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const inUse = await prisma.ticket.count({ where: { slaId: id } });
  if (inUse > 0) throw new Error(`Cannot delete: ${inUse} ticket(s) reference this SLA policy.`);
  await prisma.sLA.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "sla.deleted", entityType: "SLA", entityId: id });
}
