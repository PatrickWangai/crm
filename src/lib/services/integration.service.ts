import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { IntegrationConfigInput } from "@/lib/validation/integration";

export async function listIntegrations() {
  await requireAnyPermission(["integrations.manage"]);
  return prisma.integrationConfig.findMany({ orderBy: { displayName: "asc" } });
}

export async function updateIntegrationConfig(id: string, input: IntegrationConfigInput) {
  const actor = await requireAnyPermission(["integrations.manage"]);
  const before = await prisma.integrationConfig.findUniqueOrThrow({ where: { id } });

  const record = await prisma.integrationConfig.update({
    where: { id },
    data: {
      status: input.status,
      config: input.endpoint ? { endpoint: input.endpoint } : undefined,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "integration.updated",
    entityType: "IntegrationConfig",
    entityId: id,
    previousValue: { status: before.status },
    newValue: { status: record.status },
  });

  return record;
}

/**
 * Simulates a connectivity check against the vendor sandbox/mock endpoint.
 * No real credentials exist in this environment, so this never claims a
 * MOCK integration is actually CONNECTED — it only proves the interface
 * layer itself is reachable and records when it was last checked.
 */
export async function testIntegrationConnection(id: string) {
  const actor = await requireAnyPermission(["integrations.manage"]);
  const record = await prisma.integrationConfig.update({ where: { id }, data: { lastSyncedAt: new Date() } });

  await recordAudit({ userId: actor.id, action: "integration.tested", entityType: "IntegrationConfig", entityId: id, newValue: { status: record.status } });

  return record;
}
