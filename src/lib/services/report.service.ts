import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "VIEWING_SCHEDULED", "RESERVATION", "CLOSED_WON", "CLOSED_LOST"] as const;

export async function getLeadPipelineReport() {
  await requireAnyPermission(["reports.view"]);

  const counts = await prisma.lead.groupBy({ by: ["status"], _count: true });
  const map = new Map(counts.map((c) => [c.status, c._count]));
  const funnel = LEAD_STATUSES.map((status) => ({ status, count: map.get(status) ?? 0 }));

  const total = funnel.reduce((sum, f) => sum + f.count, 0);
  const won = map.get("CLOSED_WON") ?? 0;
  const lost = map.get("CLOSED_LOST") ?? 0;
  const closed = won + lost;
  const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

  return { funnel, total, won, lost, winRate };
}

export async function getLeadSourceReport() {
  await requireAnyPermission(["reports.view"]);

  const [bySource, wonBySource] = await Promise.all([
    prisma.lead.groupBy({ by: ["source"], _count: true }),
    prisma.lead.groupBy({ by: ["source"], _count: true, where: { status: "CLOSED_WON" } }),
  ]);
  const wonMap = new Map(wonBySource.map((w) => [w.source, w._count]));

  return bySource
    .map((s) => {
      const won = wonMap.get(s.source) ?? 0;
      return { source: s.source, count: s._count, won, conversionRate: s._count > 0 ? Math.round((won / s._count) * 100) : 0 };
    })
    .sort((a, b) => b.count - a.count);
}

export async function getTicketSlaReport() {
  await requireAnyPermission(["reports.view"]);

  const closedOut = await prisma.ticket.findMany({
    where: { status: { in: ["COMPLETED", "CLOSED"] }, dueAt: { not: null } },
    select: { dueAt: true, resolvedAt: true, closedAt: true },
  });

  let onTime = 0;
  let late = 0;
  for (const t of closedOut) {
    const resolvedAt = t.resolvedAt ?? t.closedAt;
    if (!t.dueAt || !resolvedAt) continue;
    if (resolvedAt <= t.dueAt) onTime += 1;
    else late += 1;
  }

  const [openBreached, byPriority] = await Promise.all([
    prisma.ticket.count({ where: { status: { notIn: ["COMPLETED", "CLOSED"] }, dueAt: { lt: new Date() } } }),
    prisma.ticket.groupBy({ by: ["priority"], _count: true }),
  ]);

  const compliance = onTime + late > 0 ? Math.round((onTime / (onTime + late)) * 100) : null;

  return {
    onTime,
    late,
    openBreached,
    compliance,
    byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
  };
}

export async function getOccupancyReport() {
  await requireAnyPermission(["reports.view"]);

  const byStatus = await prisma.unit.groupBy({ by: ["status"], _count: true });
  const total = byStatus.reduce((sum, r) => sum + r._count, 0);
  const occupied = byStatus.find((r) => r.status === "OCCUPIED")?._count ?? 0;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return { byStatus: byStatus.map((r) => ({ status: r.status, count: r._count })), total, occupied, occupancyRate };
}

export async function getFinanceReport() {
  await requireAnyPermission(["reports.view"]);

  const [invoices, paymentSum, overdueCount, byStatus] = await Promise.all([
    prisma.invoice.findMany({ select: { amount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.invoice.count({ where: { status: { in: ["SENT", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } } }),
    prisma.invoice.groupBy({ by: ["status"], _count: true }),
  ]);

  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalCollected = Number(paymentSum._sum.amount ?? 0);

  return {
    totalInvoiced,
    totalCollected,
    outstanding: totalInvoiced - totalCollected,
    overdueCount,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
  };
}

export async function getMaintenanceReport() {
  await requireAnyPermission(["reports.view"]);

  const [byStatus, completed] = await Promise.all([
    prisma.maintenanceRequest.groupBy({ by: ["status"], _count: true }),
    prisma.maintenanceRequest.findMany({ where: { completedAt: { not: null } }, select: { createdAt: true, completedAt: true } }),
  ]);

  const avgCompletionDays =
    completed.length > 0
      ? Math.round((completed.reduce((sum, r) => sum + (r.completedAt!.getTime() - r.createdAt.getTime()), 0) / completed.length / (1000 * 60 * 60 * 24)) * 10) / 10
      : null;

  return { byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })), avgCompletionDays };
}

export async function getTaskReport() {
  await requireAnyPermission(["reports.view"]);
  const byStatus = await prisma.task.groupBy({ by: ["status"], _count: true });
  return { byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })) };
}

/** Last 6 months of collected payments, bucketed by calendar month — feeds the AI trend forecast on /reports. */
export async function getMonthlyRevenueTrend() {
  await requireAnyPermission(["reports.view"]);

  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({ where: { paidAt: { gte: since } }, select: { paidAt: true, amount: true } });

  const buckets = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const p of payments) {
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount));
  }

  return Array.from(buckets.entries()).map(([month, total]) => ({ month, total }));
}
