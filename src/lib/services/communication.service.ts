import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { CommunicationInput } from "@/lib/validation/stakeholder";

export async function logCommunication(stakeholderId: string, input: CommunicationInput) {
  const actor = await requireAnyPermission(["communications.create"]);

  const record = await prisma.communication.create({
    data: {
      stakeholderId,
      channel: input.channel,
      direction: input.direction,
      subject: input.subject || undefined,
      content: input.content,
      staffId: actor.id,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "communication.logged",
    entityType: "Stakeholder",
    entityId: stakeholderId,
    newValue: { channel: record.channel, direction: record.direction },
  });

  return record;
}
