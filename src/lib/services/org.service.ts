import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { BusinessUnitInput, BusinessUnitUpdateInput, DepartmentInput } from "@/lib/validation/org";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

// ---- Departments ----------------------------------------------------------

export async function listDepartments() {
  await requirePermission("departments.manage");
  return prisma.department.findMany({
    include: { businessUnit: true, _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(input: DepartmentInput) {
  const actor = await requirePermission("departments.manage");
  const dept = await prisma.department.create({
    data: { name: input.name, code: input.code.toUpperCase(), businessUnitId: cleanId(input.businessUnitId), category: input.category || null },
  });
  await recordAudit({ userId: actor.id, action: "department.created", entityType: "Department", entityId: dept.id, newValue: input });
  return dept;
}

export async function updateDepartment(id: string, input: DepartmentInput) {
  const actor = await requirePermission("departments.manage");
  const dept = await prisma.department.update({
    where: { id },
    data: { name: input.name, code: input.code.toUpperCase(), businessUnitId: cleanId(input.businessUnitId), category: input.category || null },
  });
  await recordAudit({ userId: actor.id, action: "department.updated", entityType: "Department", entityId: dept.id, newValue: input });
  return dept;
}

export async function deleteDepartment(id: string) {
  const actor = await requirePermission("departments.manage");
  const userCount = await prisma.user.count({ where: { departmentId: id } });
  if (userCount > 0) {
    throw new Error(`Cannot delete: ${userCount} user(s) are still assigned to this department.`);
  }
  await prisma.department.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "department.deleted", entityType: "Department", entityId: id });
}

// ---- Business Units ---------------------------------------------------------

export async function listBusinessUnits() {
  await requirePermission("departments.manage");
  return prisma.businessUnit.findMany({
    include: { _count: { select: { users: true, departments: true } } },
    orderBy: { code: "asc" },
  });
}

export async function createBusinessUnit(input: BusinessUnitInput) {
  const actor = await requirePermission("departments.manage");
  const bu = await prisma.businessUnit.create({
    data: { name: input.name, code: input.code.toUpperCase(), description: input.description || undefined },
  });
  await recordAudit({ userId: actor.id, action: "business_unit.created", entityType: "BusinessUnit", entityId: bu.id, newValue: input });
  return bu;
}

export async function updateBusinessUnit(id: string, input: BusinessUnitUpdateInput) {
  const actor = await requirePermission("departments.manage");
  const bu = await prisma.businessUnit.update({
    where: { id },
    data: { name: input.name, description: input.description || undefined },
  });
  await recordAudit({ userId: actor.id, action: "business_unit.updated", entityType: "BusinessUnit", entityId: bu.id, newValue: input });
  return bu;
}

export async function deleteBusinessUnit(id: string) {
  const actor = await requirePermission("departments.manage");
  const [userCount, departmentCount] = await Promise.all([
    prisma.user.count({ where: { businessUnitId: id } }),
    prisma.department.count({ where: { businessUnitId: id } }),
  ]);
  if (userCount > 0) throw new Error(`Cannot delete: ${userCount} user(s) are still assigned to this business unit.`);
  if (departmentCount > 0) throw new Error(`Cannot delete: ${departmentCount} department(s) still belong to this business unit.`);
  await prisma.businessUnit.delete({ where: { id } });
  await recordAudit({ userId: actor.id, action: "business_unit.deleted", entityType: "BusinessUnit", entityId: id });
}
