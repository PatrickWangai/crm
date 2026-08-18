import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { CommunicationChannel, CommunicationDirection } from "@prisma/client";
import { requireAnyPermission, hasPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { CommunicationInput } from "@/lib/validation/communication";

export type CommunicationTarget = { stakeholderId: string } | { leadId: string } | { ticketId: string };

export async function logCommunication(target: CommunicationTarget, input: CommunicationInput) {
  const actor = await requireAnyPermission(["communications.create"]);

  const record = await prisma.communication.create({
    data: {
      stakeholderId: "stakeholderId" in target ? target.stakeholderId : undefined,
      relatedLeadId: "leadId" in target ? target.leadId : undefined,
      relatedTicketId: "ticketId" in target ? target.ticketId : undefined,
      channel: input.channel,
      direction: input.direction,
      subject: input.subject || undefined,
      content: input.content,
      staffId: actor.id,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    },
  });

  const entityType = "stakeholderId" in target ? "Stakeholder" : "leadId" in target ? "Lead" : "Ticket";
  const entityId = "stakeholderId" in target ? target.stakeholderId : "leadId" in target ? target.leadId : target.ticketId;

  await recordAudit({
    userId: actor.id,
    action: "communication.logged",
    entityType,
    entityId,
    newValue: { channel: record.channel, direction: record.direction },
  });

  return record;
}

export interface ListCommunicationsParams {
  q?: string;
  channel?: CommunicationChannel;
  direction?: CommunicationDirection;
  page?: number;
  pageSize?: number;
}

/** Portfolio-wide communication history, independent of any single stakeholder/lead/ticket. */
export async function listCommunications(params: ListCommunicationsParams = {}) {
  const user = await requireAnyPermission(["communications.view_all", "communications.view_own"]);
  const scopedToSelf = !hasPermission(user, "communications.view_all");

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 25;

  const where = {
    AND: [
      scopedToSelf ? { staffId: user.id } : {},
      params.q ? { content: { contains: params.q, mode: "insensitive" as const } } : {},
      params.channel ? { channel: params.channel } : {},
      params.direction ? { direction: params.direction } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.communication.findMany({
      where,
      include: {
        staff: { select: { firstName: true, lastName: true } },
        stakeholder: { select: { id: true, firstName: true, lastName: true } },
        relatedLead: { select: { id: true, firstName: true, lastName: true } },
        relatedTicket: { select: { id: true, ticketNumber: true, subject: true } },
      },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.communication.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
