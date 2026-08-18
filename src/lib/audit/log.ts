import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export interface AuditEntry {
  userId?: string | null;
  action: string; // e.g. "customer.created", "ticket.status_changed"
  entityType: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
}

/** Records an audit trail entry. Never throws — audit failures must not break the calling action. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const hdrs = await headers();
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        previousValue: entry.previousValue === undefined ? undefined : (entry.previousValue as object),
        newValue: entry.newValue === undefined ? undefined : (entry.newValue as object),
        ipAddress: hdrs.get("x-forwarded-for") ?? undefined,
        userAgent: hdrs.get("user-agent") ?? undefined,
      },
    });
  } catch (err) {
    console.error("Failed to record audit log", err);
  }
}
