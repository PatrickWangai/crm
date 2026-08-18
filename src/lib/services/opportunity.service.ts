import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { OpportunityStage } from "@prisma/client";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { OpportunityInput } from "@/lib/validation/lead";

async function nextOpportunityCode(): Promise<string> {
  const count = await prisma.opportunity.count();
  return `OPP-${String(count + 1).padStart(6, "0")}`;
}

export async function createOpportunityForLead(leadId: string, input: OpportunityInput) {
  const actor = await requireAnyPermission(["opportunities.manage"]);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const code = await nextOpportunityCode();

  const opportunity = await prisma.opportunity.create({
    data: {
      code,
      title: input.title,
      leadId,
      stakeholderId: lead.convertedStakeholderId ?? undefined,
      value: input.value,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
      stage: "QUALIFICATION",
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "opportunity.created",
    entityType: "Lead",
    entityId: leadId,
    newValue: { opportunityId: opportunity.id, value: input.value },
  });

  return opportunity;
}

export async function updateOpportunityStage(opportunityId: string, stage: OpportunityStage) {
  const actor = await requireAnyPermission(["opportunities.manage"]);
  const before = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });

  const isClosed = stage === "CLOSED_WON" || stage === "CLOSED_LOST";
  const opportunity = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { stage, closedAt: isClosed ? new Date() : null },
  });

  await recordAudit({
    userId: actor.id,
    action: "opportunity.stage_changed",
    entityType: "Opportunity",
    entityId: opportunityId,
    previousValue: { stage: before.stage },
    newValue: { stage },
  });

  return opportunity;
}

export async function deleteOpportunity(opportunityId: string) {
  const actor = await requireAnyPermission(["opportunities.manage"]);
  const opportunity = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  await prisma.opportunity.delete({ where: { id: opportunityId } });
  await recordAudit({
    userId: actor.id,
    action: "opportunity.deleted",
    entityType: "Lead",
    entityId: opportunity.leadId ?? opportunityId,
  });
}
