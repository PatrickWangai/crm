import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/rbac/guard";

export async function listRoleOptions() {
  await requireAuth();
  return prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
}

export async function listDepartmentOptions() {
  await requireAuth();
  return prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });
}

/**
 * Departments a ticket can actually be routed to — any department with a
 * category set (see department-routing.ts, Department.category). Excludes
 * internal oversight departments (Board/Executive/Internal Audit/SACCO
 * Credit Committee), which have no category and no staff able to act on a
 * ticket. Use this instead of listDepartmentOptions() anywhere a user picks
 * a ticket's department (manual create/edit, forward-to-department).
 */
export async function listTicketDepartmentOptions() {
  await requireAuth();
  return prisma.department.findMany({
    where: { category: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

export async function listBusinessUnitOptions() {
  await requireAuth();
  return prisma.businessUnit.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });
}

/** Distinct, non-empty property regions — feeds the Reports page region filter. */
export async function listPropertyRegions() {
  await requireAuth();
  const rows = await prisma.property.findMany({
    where: { region: { not: null } },
    distinct: ["region"],
    orderBy: { region: "asc" },
    select: { region: true },
  });
  return rows.map((r) => r.region).filter((r): r is string => !!r);
}

export async function listUserOptions() {
  await requireAuth();
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true, jobTitle: true },
  });
  return users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, jobTitle: u.jobTitle }));
}

export async function listStakeholderOptions() {
  await requireAuth();
  const stakeholders = await prisma.stakeholder.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, firstName: true, lastName: true, code: true },
  });
  return stakeholders.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName} (${s.code})` }));
}

export async function listPropertyOptions() {
  await requireAuth();
  const properties = await prisma.property.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });
  return properties.map((p) => ({ id: p.id, name: `${p.name} (${p.code})` }));
}

export async function listLeaseOptions() {
  await requireAuth();
  const leases = await prisma.lease.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, code: true, tenant: { select: { firstName: true, lastName: true } } },
  });
  return leases.map((l) => ({ id: l.id, name: `${l.code} — ${l.tenant.firstName} ${l.tenant.lastName}` }));
}

/** All units, with their property name, for pickers that aren't restricted to vacancy (e.g. maintenance job cards). */
export async function listUnitOptions() {
  await requireAuth();
  const units = await prisma.unit.findMany({
    orderBy: { unitNumber: "asc" },
    include: { property: { select: { name: true } } },
  });
  return units.map((u) => ({ id: u.id, name: `${u.property.name} — Unit ${u.unitNumber} (${u.code})` }));
}

/** Vacant units across the portfolio, for picking a unit when starting a new lease. */
export async function listVacantUnitOptions() {
  await requireAuth();
  const units = await prisma.unit.findMany({
    where: { status: "VACANT" },
    orderBy: { unitNumber: "asc" },
    include: { property: { select: { name: true } } },
  });
  return units.map((u) => ({ id: u.id, name: `${u.property.name} — Unit ${u.unitNumber} (${u.code})` }));
}
