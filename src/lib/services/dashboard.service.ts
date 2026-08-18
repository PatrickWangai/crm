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
