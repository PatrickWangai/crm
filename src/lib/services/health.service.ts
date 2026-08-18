import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";

export interface SystemHealthReport {
  database: { connected: boolean; latencyMs: number | null; error?: string };
  recordCounts: { label: string; count: number }[];
  integrations: { displayName: string; status: string; lastSyncedAt: Date | null }[];
  runtime: { nodeVersion: string; environment: string; uptimeSeconds: number; serverTime: Date };
}

async function checkDatabase(): Promise<SystemHealthReport["database"]> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { connected: false, latencyMs: null, error: err instanceof Error ? err.message : "Unknown database error" };
  }
}

export async function getSystemHealth(): Promise<SystemHealthReport> {
  await requireAnyPermission(["settings.manage"]);

  const [database, userCount, leadCount, stakeholderCount, propertyCount, unitCount, leaseCount, ticketCount, invoiceCount, taskCount, documentCount, integrations] =
    await Promise.all([
      checkDatabase(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
      prisma.stakeholder.count(),
      prisma.property.count(),
      prisma.unit.count(),
      prisma.lease.count(),
      prisma.ticket.count(),
      prisma.invoice.count(),
      prisma.task.count(),
      prisma.document.count(),
      prisma.integrationConfig.findMany({ select: { displayName: true, status: true, lastSyncedAt: true }, orderBy: { displayName: "asc" } }),
    ]);

  return {
    database,
    recordCounts: [
      { label: "Active users", count: userCount },
      { label: "Leads", count: leadCount },
      { label: "Stakeholders", count: stakeholderCount },
      { label: "Properties", count: propertyCount },
      { label: "Units", count: unitCount },
      { label: "Leases", count: leaseCount },
      { label: "Tickets", count: ticketCount },
      { label: "Invoices", count: invoiceCount },
      { label: "Tasks", count: taskCount },
      { label: "Documents", count: documentCount },
    ],
    integrations,
    runtime: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? "development",
      uptimeSeconds: Math.floor(process.uptime()),
      serverTime: new Date(),
    },
  };
}
