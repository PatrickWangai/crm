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

export async function listBusinessUnitOptions() {
  await requireAuth();
  return prisma.businessUnit.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });
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
