import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import type { Prisma, TicketStatus } from "@prisma/client";

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "VIEWING_SCHEDULED", "RESERVATION", "CLOSED_WON", "CLOSED_LOST"] as const;

/**
 * Shared filter set applied across every report below. Not every field is
 * meaningful for every report (e.g. leases have no department) — each report
 * function only wires up the dimensions its underlying model actually has.
 */
export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  businessUnitId?: string;
  departmentId?: string;
  employeeId?: string;
  region?: string;
  ticketStatus?: TicketStatus;
}

function dateRange(filters: ReportFilters): Prisma.DateTimeFilter | undefined {
  if (!filters.dateFrom && !filters.dateTo) return undefined;
  return {
    ...(filters.dateFrom && { gte: filters.dateFrom }),
    ...(filters.dateTo && { lte: filters.dateTo }),
  };
}

function leadWhere(filters: ReportFilters): Prisma.LeadWhereInput {
  const range = dateRange(filters);
  return {
    ...(range && { createdAt: range }),
    ...(filters.businessUnitId && { businessUnitId: filters.businessUnitId }),
    ...(filters.employeeId && { assignedToId: filters.employeeId }),
  };
}

function ticketWhere(filters: ReportFilters, extra: Prisma.TicketWhereInput = {}): Prisma.TicketWhereInput {
  const range = dateRange(filters);
  return {
    ...(range && { createdAt: range }),
    ...(filters.businessUnitId && { businessUnitId: filters.businessUnitId }),
    ...(filters.departmentId && { departmentId: filters.departmentId }),
    ...(filters.employeeId && { assignedToId: filters.employeeId }),
    ...(filters.ticketStatus && { status: filters.ticketStatus }),
    ...extra,
  };
}

function propertyScope(filters: ReportFilters): Prisma.PropertyWhereInput {
  return {
    ...(filters.businessUnitId && { businessUnitId: filters.businessUnitId }),
    ...(filters.region && { region: filters.region }),
  };
}

function invoiceWhere(filters: ReportFilters): Prisma.InvoiceWhereInput {
  const range = dateRange(filters);
  return {
    ...(range && { createdAt: range }),
    ...(filters.businessUnitId && { businessUnitId: filters.businessUnitId }),
    ...(filters.employeeId && { createdById: filters.employeeId }),
  };
}

function maintenanceWhere(filters: ReportFilters): Prisma.MaintenanceRequestWhereInput {
  const range = dateRange(filters);
  const property = propertyScope(filters);
  return {
    ...(range && { createdAt: range }),
    ...(filters.employeeId && { assignedToId: filters.employeeId }),
    ...(Object.keys(property).length > 0 && { property }),
  };
}

function taskWhere(filters: ReportFilters): Prisma.TaskWhereInput {
  const range = dateRange(filters);
  return {
    ...(range && { createdAt: range }),
    ...(filters.departmentId && { departmentId: filters.departmentId }),
    ...(filters.employeeId && { assigneeId: filters.employeeId }),
  };
}

export async function getLeadPipelineReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const where = leadWhere(filters);
  const counts = await prisma.lead.groupBy({ by: ["status"], _count: true, where });
  const map = new Map(counts.map((c) => [c.status, c._count]));
  const funnel = LEAD_STATUSES.map((status) => ({ status, count: map.get(status) ?? 0 }));

  const total = funnel.reduce((sum, f) => sum + f.count, 0);
  const won = map.get("CLOSED_WON") ?? 0;
  const lost = map.get("CLOSED_LOST") ?? 0;
  const closed = won + lost;
  const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

  return { funnel, total, won, lost, winRate };
}

export async function getLeadSourceReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const where = leadWhere(filters);
  const [bySource, wonBySource] = await Promise.all([
    prisma.lead.groupBy({ by: ["source"], _count: true, where }),
    prisma.lead.groupBy({ by: ["source"], _count: true, where: { ...where, status: "CLOSED_WON" } }),
  ]);
  const wonMap = new Map(wonBySource.map((w) => [w.source, w._count]));

  return bySource
    .map((s) => {
      const won = wonMap.get(s.source) ?? 0;
      return { source: s.source, count: s._count, won, conversionRate: s._count > 0 ? Math.round((won / s._count) * 100) : 0 };
    })
    .sort((a, b) => b.count - a.count);
}

export async function getTicketSlaReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const closedOut = await prisma.ticket.findMany({
    where: ticketWhere(filters, { status: { in: ["COMPLETED", "CLOSED"] }, dueAt: { not: null } }),
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
    prisma.ticket.count({ where: ticketWhere(filters, { status: { notIn: ["COMPLETED", "CLOSED"] }, dueAt: { lt: new Date() } }) }),
    prisma.ticket.groupBy({ by: ["priority"], _count: true, where: ticketWhere(filters) }),
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

export async function getOccupancyReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const property = propertyScope(filters);
  const where: Prisma.UnitWhereInput = Object.keys(property).length > 0 ? { property } : {};

  const byStatus = await prisma.unit.groupBy({ by: ["status"], _count: true, where });
  const total = byStatus.reduce((sum, r) => sum + r._count, 0);
  const occupied = byStatus.find((r) => r.status === "OCCUPIED")?._count ?? 0;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return { byStatus: byStatus.map((r) => ({ status: r.status, count: r._count })), total, occupied, occupancyRate };
}

export async function getFinanceReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const where = invoiceWhere(filters);

  const [invoices, paymentSum, overdueCount, byStatus] = await Promise.all([
    prisma.invoice.findMany({ where, select: { amount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { invoice: where } }),
    prisma.invoice.count({ where: { ...where, status: { in: ["SENT", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } } }),
    prisma.invoice.groupBy({ by: ["status"], _count: true, where }),
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

export async function getMaintenanceReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const where = maintenanceWhere(filters);
  const [byStatus, completed] = await Promise.all([
    prisma.maintenanceRequest.groupBy({ by: ["status"], _count: true, where }),
    prisma.maintenanceRequest.findMany({ where: { ...where, completedAt: { not: null } }, select: { createdAt: true, completedAt: true } }),
  ]);

  const avgCompletionDays =
    completed.length > 0
      ? Math.round((completed.reduce((sum, r) => sum + (r.completedAt!.getTime() - r.createdAt.getTime()), 0) / completed.length / (1000 * 60 * 60 * 24)) * 10) / 10
      : null;

  return { byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })), avgCompletionDays };
}

export async function getTaskReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);
  const byStatus = await prisma.task.groupBy({ by: ["status"], _count: true, where: taskWhere(filters) });
  return { byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })) };
}

/** Last 6 months of collected payments, bucketed by calendar month — feeds the AI trend forecast on /reports. Window is fixed regardless of the date filter; only business unit narrows it. */
export async function getMonthlyRevenueTrend(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: since },
      ...(filters.businessUnitId && { invoice: { businessUnitId: filters.businessUnitId } }),
    },
    select: { paidAt: true, amount: true },
  });

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

/** Complaints are tickets logged under the "Complaint" category — a dedicated cut of the ticket data, distinct from the overall SLA report. */
export async function getComplaintsReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const where = ticketWhere(filters, { category: "Complaint" });

  const [total, byStatus, byPriority, byDepartment, resolved, recent] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.groupBy({ by: ["status"], _count: true, where }),
    prisma.ticket.groupBy({ by: ["priority"], _count: true, where }),
    prisma.ticket.groupBy({ by: ["departmentId"], _count: true, where }),
    prisma.ticket.findMany({
      where: { ...where, status: { in: ["COMPLETED", "CLOSED"] } },
      select: { createdAt: true, resolvedAt: true, closedAt: true },
    }),
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        stakeholder: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
        businessUnit: { select: { name: true } },
      },
    }),
  ]);

  const resolvedWithTimestamp = resolved.filter((r) => r.resolvedAt ?? r.closedAt);
  const avgResolutionDays =
    resolvedWithTimestamp.length > 0
      ? Math.round(
          (resolvedWithTimestamp.reduce((sum, r) => sum + ((r.resolvedAt ?? r.closedAt)!.getTime() - r.createdAt.getTime()), 0) /
            resolvedWithTimestamp.length /
            (1000 * 60 * 60 * 24)) *
            10,
        ) / 10
      : null;

  const departmentIds = byDepartment.map((d) => d.departmentId).filter((id): id is string => !!id);
  const departments = departmentIds.length > 0 ? await prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, name: true } }) : [];
  const deptNameMap = new Map(departments.map((d) => [d.id, d.name]));

  return {
    total,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
    byDepartment: byDepartment
      .map((d) => ({ department: d.departmentId ? (deptNameMap.get(d.departmentId) ?? "Unknown") : "Unassigned", count: d._count }))
      .sort((a, b) => b.count - a.count),
    avgResolutionDays,
    recent: recent.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      stakeholderName: `${t.stakeholder.firstName} ${t.stakeholder.lastName}`,
      department: t.department?.name ?? "Unassigned",
      businessUnit: t.businessUnit?.name ?? "—",
    })),
  };
}

/** Upcoming and overdue lease renewals — distinct from the automated flagExpiringLeases reminder job, this is the analytics/trend view for the Reports page. */
export async function getLeaseExpiryReport(filters: ReportFilters = {}) {
  await requireAnyPermission(["reports.view"]);

  const property = propertyScope(filters);
  const scopeWhere: Prisma.LeaseWhereInput = Object.keys(property).length > 0 ? { unit: { property } } : {};

  const byStatus = await prisma.lease.groupBy({ by: ["status"], _count: true, where: scopeWhere });

  const now = new Date();
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const in60 = new Date(now);
  in60.setDate(in60.getDate() + 60);
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);

  const range = dateRange(filters);

  const [expiring30, expiring60, expiring90, overdue, upcoming] = await Promise.all([
    prisma.lease.count({ where: { ...scopeWhere, status: "ACTIVE", endDate: { gte: now, lte: in30 } } }),
    prisma.lease.count({ where: { ...scopeWhere, status: "ACTIVE", endDate: { gt: in30, lte: in60 } } }),
    prisma.lease.count({ where: { ...scopeWhere, status: "ACTIVE", endDate: { gt: in60, lte: in90 } } }),
    prisma.lease.count({ where: { ...scopeWhere, status: "ACTIVE", endDate: { lt: now } } }),
    prisma.lease.findMany({
      where: { ...scopeWhere, status: "ACTIVE", endDate: range ?? { lte: in90 } },
      orderBy: { endDate: "asc" },
      take: 25,
      select: {
        id: true,
        code: true,
        endDate: true,
        rentAmount: true,
        tenant: { select: { firstName: true, lastName: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true, region: true } } } },
      },
    }),
  ]);

  return {
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    expiring30,
    expiring60,
    expiring90,
    overdue,
    upcoming: upcoming.map((l) => ({
      id: l.id,
      code: l.code,
      tenantName: `${l.tenant.firstName} ${l.tenant.lastName}`,
      unitLabel: `${l.unit.property.name} — Unit ${l.unit.unitNumber}`,
      region: l.unit.property.region,
      endDate: l.endDate,
      rentAmount: Number(l.rentAmount),
      daysRemaining: Math.ceil((l.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    })),
  };
}
