import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, hasPermission } from "@/lib/rbac/guard";
import { permissionsOf } from "@/lib/auth/session";

export async function getOrgOverview() {
  const user = await requireAuth();
  if (!hasPermission(user, "users.manage") && !hasPermission(user, "reports.view")) return null;

  const [totalUsers, activeUsers, departments, businessUnits, roles, usersByBusinessUnit, usersByRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.department.count(),
    prisma.businessUnit.count(),
    prisma.role.count(),
    prisma.businessUnit.findMany({
      select: { name: true, code: true, _count: { select: { users: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.role.findMany({
      select: { name: true, _count: { select: { users: true } } },
      where: { users: { some: {} } },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    departments,
    businessUnits,
    roles,
    usersByBusinessUnit: usersByBusinessUnit.map((bu) => ({ name: bu.code, count: bu._count.users })),
    usersByRole: usersByRole.map((r) => ({ name: r.name, count: r._count.users })).sort((a, b) => b.count - a.count),
  };
}

export async function getRecentActivity(limit = 8) {
  const user = await requireAuth();
  const orgWide = hasPermission(user, "audit_logs.view");

  const entries = await prisma.auditLog.findMany({
    where: orgWide ? undefined : { userId: user.id },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return { entries, orgWide };
}

/** Sales & Marketing: my (or org-wide, if leads.view_all) pipeline snapshot. */
export async function getMyPipelineSnapshot() {
  const user = await requireAuth();
  if (!hasPermission(user, "leads.view_all") && !hasPermission(user, "leads.view_own")) return null;
  const scopedToSelf = !hasPermission(user, "leads.view_all");
  const where = scopedToSelf ? { assignedToId: user.id } : {};

  const byStatus = await prisma.lead.groupBy({ by: ["status"], where, _count: true });
  const total = byStatus.reduce((sum, s) => sum + s._count, 0);
  const won = byStatus.find((s) => s.status === "CLOSED_WON")?._count ?? 0;
  const lost = byStatus.find((s) => s.status === "CLOSED_LOST")?._count ?? 0;

  return { total, active: total - won - lost, won, lost, scopedToSelf };
}

/** Customer Care: my (or org-wide, if tickets.view_all) open ticket / SLA snapshot. */
export async function getMyTicketSnapshot() {
  const user = await requireAuth();
  if (!hasPermission(user, "tickets.view_all") && !hasPermission(user, "tickets.view_own")) return null;
  const scopedToSelf = !hasPermission(user, "tickets.view_all");
  const where = scopedToSelf ? { assignedToId: user.id } : {};

  const [open, breached] = await Promise.all([
    prisma.ticket.count({ where: { ...where, status: { notIn: ["COMPLETED", "CLOSED"] } } }),
    prisma.ticket.count({ where: { ...where, status: { notIn: ["COMPLETED", "CLOSED"] }, dueAt: { lt: new Date() } } }),
  ]);

  return { open, breached, scopedToSelf };
}

/** Property Management: portfolio occupancy and open maintenance snapshot. */
export async function getPropertySnapshot() {
  const user = await requireAuth();
  if (!hasPermission(user, "properties.view_all")) return null;

  const [byStatus, openMaintenance] = await Promise.all([
    prisma.unit.groupBy({ by: ["status"], _count: true }),
    prisma.maintenanceRequest.count({ where: { status: { notIn: ["COMPLETED", "CLOSED"] } } }),
  ]);
  const total = byStatus.reduce((sum, r) => sum + r._count, 0);
  const occupied = byStatus.find((r) => r.status === "OCCUPIED")?._count ?? 0;

  return { total, occupied, occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0, openMaintenance };
}

/** Finance: revenue and arrears snapshot. */
export async function getFinanceSnapshot() {
  const user = await requireAuth();
  if (!hasPermission(user, "finance.view")) return null;

  const [invoices, paymentSum, overdueCount] = await Promise.all([
    prisma.invoice.findMany({ select: { amount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.invoice.count({ where: { status: { in: ["SENT", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } } }),
  ]);
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalCollected = Number(paymentSum._sum.amount ?? 0);

  return { totalInvoiced, totalCollected, outstanding: totalInvoiced - totalCollected, overdueCount };
}

export async function getMyOrgContext() {
  const user = await requireAuth();
  const [directReportsCount, manager, unreadNotifications] = await Promise.all([
    prisma.user.count({ where: { reportingToId: user.id } }),
    user.reportingToId
      ? prisma.user.findUnique({ where: { id: user.reportingToId }, select: { firstName: true, lastName: true, jobTitle: true } })
      : Promise.resolve(null),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return {
    directReportsCount,
    manager,
    unreadNotifications,
    permissionCount: permissionsOf(user).size,
  };
}
