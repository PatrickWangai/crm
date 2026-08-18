import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { CommunicationInput } from "@/lib/validation/communication";

export type CommunicationTarget = { stakeholderId: string } | { leadId: string };

export async function logCommunication(target: CommunicationTarget, input: CommunicationInput) {
  const actor = await requireAnyPermission(["communications.create"]);

  const record = await prisma.communication.create({
    data: {
      stakeholderId: "stakeholderId" in target ? target.stakeholderId : undefined,
      relatedLeadId: "leadId" in target ? target.leadId : undefined,
      channel: input.channel,
      direction: input.direction,
      subject: input.subject || undefined,
      content: input.content,
      staffId: actor.id,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    },
  });

  const entityType = "stakeholderId" in target ? "Stakeholder" : "Lead";
  const entityId = "stakeholderId" in target ? target.stakeholderId : target.leadId;

  await recordAudit({
    userId: actor.id,
    action: "communication.logged",
    entityType,
    entityId,
    newValue: { channel: record.channel, direction: record.direction },
  });

  return record;
}
