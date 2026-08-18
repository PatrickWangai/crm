import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { WorkflowInput } from "@/lib/validation/workflow";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

export async function listWorkflows() {
  await requireAnyPermission(["settings.manage"]);
  return prisma.workflow.findMany({
    include: { businessUnit: { select: { id: true, name: true } }, createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: { name: "asc" },
  });
}

/**
 * Whether the given automation trigger is enabled. A trigger with no matching
 * Workflow row is treated as enabled by default (so the underlying checks
 * still work out of the box before an admin has visited /admin/workflows).
 */
export async function isWorkflowActive(triggerType: string): Promise<boolean> {
  const workflow = await prisma.workflow.findFirst({ where: { triggerType } });
  return workflow ? workflow.isActive : true;
}

export async function createWorkflow(input: WorkflowInput) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const record = await prisma.workflow.create({
    data: {
      name: input.name,
      description: input.description || undefined,
      triggerType: input.triggerType,
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      isActive: input.isActive === "true",
      createdById: actor.id,
    },
  });
  await recordAudit({ userId: actor.id, action: "workflow.created", entityType: "Workflow", entityId: record.id, newValue: { name: record.name } });
  return record;
}

export async function updateWorkflow(id: string, input: WorkflowInput) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const record = await prisma.workflow.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || undefined,
      triggerType: input.triggerType,
      businessUnitId: cleanId(input.businessUnitId),
      isActive: input.isActive === "true",
    },
  });
  await recordAudit({ userId: actor.id, action: "workflow.updated", entityType: "Workflow", entityId: id, newValue: { isActive: record.isActive } });
  return record;
}

export async function deleteWorkflow(id: string) {
  const actor = await requireAnyPermission(["settings.manage"]);
  await prisma.workflow.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "workflow.deleted", entityType: "Workflow", entityId: id });
}
