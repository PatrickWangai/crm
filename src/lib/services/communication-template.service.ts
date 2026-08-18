import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { CommunicationTemplateInput } from "@/lib/validation/communication-template";

export async function listCommunicationTemplates() {
  await requireAnyPermission(["settings.manage"]);
  return prisma.communicationTemplate.findMany({
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: [{ channel: "asc" }, { name: "asc" }],
  });
}

export async function createCommunicationTemplate(input: CommunicationTemplateInput) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const record = await prisma.communicationTemplate.create({
    data: {
      name: input.name,
      channel: input.channel,
      subject: input.subject || undefined,
      body: input.body,
      isActive: input.isActive === "true",
      createdById: actor.id,
    },
  });
  await recordAudit({ userId: actor.id, action: "communication_template.created", entityType: "CommunicationTemplate", entityId: record.id, newValue: { name: record.name } });
  return record;
}

export async function updateCommunicationTemplate(id: string, input: CommunicationTemplateInput) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const record = await prisma.communicationTemplate.update({
    where: { id },
    data: {
      name: input.name,
      channel: input.channel,
      subject: input.subject || undefined,
      body: input.body,
      isActive: input.isActive === "true",
    },
  });
  await recordAudit({ userId: actor.id, action: "communication_template.updated", entityType: "CommunicationTemplate", entityId: id, newValue: { name: record.name } });
  return record;
}

export async function deleteCommunicationTemplate(id: string) {
  const actor = await requireAnyPermission(["settings.manage"]);
  await prisma.communicationTemplate.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "communication_template.deleted", entityType: "CommunicationTemplate", entityId: id });
}
