import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { RoleInput } from "@/lib/validation/org";

export async function listRoles() {
  await requirePermission("roles.manage");
  return prisma.role.findMany({
    include: { _count: { select: { users: true, rolePermissions: true } } },
    orderBy: { name: "asc" },
  });
}

export async function listAllPermissions() {
  await requirePermission("roles.manage");
  return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
}

export async function getRoleDetail(roleId: string) {
  await requirePermission("roles.manage");
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: { select: { permissionId: true } },
      _count: { select: { users: true } },
    },
  });
  if (!role) return null;
  return { ...role, grantedPermissionIds: new Set(role.rolePermissions.map((rp) => rp.permissionId)) };
}

export async function setRolePermission(roleId: string, permissionId: string, granted: boolean) {
  const actor = await requirePermission("roles.manage");

  if (granted) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  await recordAudit({
    userId: actor.id,
    action: granted ? "role.permission_granted" : "role.permission_revoked",
    entityType: "Role",
    entityId: roleId,
    newValue: { permissionId },
  });
}

export async function createRole(input: RoleInput) {
  const actor = await requirePermission("roles.manage");
  const role = await prisma.role.create({
    data: { name: input.name, slug: input.slug, description: input.description || undefined, isSystem: false },
  });
  await recordAudit({ userId: actor.id, action: "role.created", entityType: "Role", entityId: role.id, newValue: input });
  return role;
}

export async function deleteRole(roleId: string) {
  const actor = await requirePermission("roles.manage");
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  if (role.isSystem) throw new Error("System roles from the CRM Blueprint cannot be deleted.");

  const userCount = await prisma.user.count({ where: { roleId } });
  if (userCount > 0) throw new Error(`Cannot delete: ${userCount} user(s) currently hold this role.`);

  await prisma.role.delete({ where: { id: roleId } });
  await recordAudit({ userId: actor.id, action: "role.deleted", entityType: "Role", entityId: roleId });
}
