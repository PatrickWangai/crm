import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { UserStatus } from "@prisma/client";
import { requireAuth, requirePermission } from "@/lib/rbac/guard";
import { DEPARTMENT_TEAM_ROLES, DEPARTMENT_HEAD_ROLE } from "@/lib/rbac/department-team-roles";
import { recordAudit } from "@/lib/audit/log";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { notifyNewAccount } from "@/lib/notifications/user-events";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation/user";

const userListInclude = {
  role: { select: { id: true, name: true, slug: true } },
  department: { select: { id: true, name: true } },
  businessUnit: { select: { id: true, name: true, code: true } },
} as const;

export interface ListUsersParams {
  q?: string;
  roleId?: string;
  departmentId?: string;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export async function listUsers(params: ListUsersParams = {}) {
  await requirePermission("users.manage");

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" as const } },
              { lastName: { contains: params.q, mode: "insensitive" as const } },
              { email: { contains: params.q, mode: "insensitive" as const } },
              { employeeId: { contains: params.q, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.roleId ? { roleId: params.roleId } : {},
      params.departmentId ? { departmentId: params.departmentId } : {},
      params.status ? { status: params.status } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userListInclude,
      orderBy: [{ status: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

async function getUserByIdInternal(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { ...userListInclude, reportingTo: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function getUserById(id: string) {
  await requirePermission("users.manage");
  return getUserByIdInternal(id);
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function createUserRecord(actorId: string, input: CreateUserInput): Promise<{ user: Awaited<ReturnType<typeof getUserByIdInternal>>; tempPassword: string }> {
  const count = await prisma.user.count();
  const employeeId = `MW-${String(count + 1).padStart(4, "0")}`;
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone || undefined,
      jobTitle: input.jobTitle || undefined,
      passwordHash,
      roleId: input.roleId,
      departmentId: cleanId(input.departmentId) ?? undefined,
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      reportingToId: cleanId(input.reportingToId) ?? undefined,
      status: "ACTIVE",
      employmentStatus: "ACTIVE",
    },
  });

  await recordAudit({
    userId: actorId,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    newValue: { email: user.email, roleId: user.roleId },
  });

  const fullUser = await getUserByIdInternal(user.id);
  if (fullUser?.email && fullUser.role) {
    await notifyNewAccount(fullUser, fullUser.role.name, tempPassword);
  }

  return { user: fullUser, tempPassword };
}

export async function createUser(input: CreateUserInput): Promise<{ user: Awaited<ReturnType<typeof getUserByIdInternal>>; tempPassword: string }> {
  const actor = await requirePermission("users.manage");
  return createUserRecord(actor.id, input);
}

/**
 * Department-scoped self-service: lets anyone with users.manage_department
 * (every operational role in an active department — see permissions.ts, not
 * just its head) add a teammate without going through ICT.
 * departmentId/businessUnitId/reportingToId are always forced to the
 * actor's own values, never trusted from the submitted input — that's the
 * actual boundary preventing someone from creating an account in a
 * department that isn't theirs, not just a UI nicety. Separately, if the
 * department has a designated head role (DEPARTMENT_HEAD_ROLE), only an
 * existing holder of that role can grant it to someone else — stops a
 * subordinate from minting a new head-level account for themselves.
 */
export async function createDepartmentTeamMember(input: CreateUserInput): Promise<{ user: Awaited<ReturnType<typeof getUserByIdInternal>>; tempPassword: string }> {
  const actor = await requirePermission("users.manage_department");
  if (!actor.department) {
    throw new Error("Your account isn't linked to a department yet — ask ICT to set that up first.");
  }

  const allowedSlugs = DEPARTMENT_TEAM_ROLES[actor.department.code] ?? [];
  if (allowedSlugs.length === 0) {
    throw new Error(`${actor.department.name} can't add team members yet — ask ICT to add this account.`);
  }

  const role = await prisma.role.findUnique({ where: { id: input.roleId }, select: { name: true, slug: true } });
  if (!role || !allowedSlugs.includes(role.slug)) {
    throw new Error("Choose a role that belongs to your department.");
  }

  const headRoleSlug = DEPARTMENT_HEAD_ROLE[actor.department.code];
  if (role.slug === headRoleSlug && actor.role.slug !== headRoleSlug) {
    throw new Error(`Only an existing ${role.name} can add another one.`);
  }

  return createUserRecord(actor.id, {
    ...input,
    departmentId: actor.department.id,
    businessUnitId: actor.businessUnitId ?? "",
    reportingToId: actor.id,
  });
}

/** Everyone in the actor's own department — same department only, never the whole organization. */
export async function listOwnDepartmentTeam() {
  const actor = await requirePermission("users.manage_department");
  if (!actor.department) return [];

  return prisma.user.findMany({
    where: { departmentId: actor.department.id },
    include: { role: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
  });
}

/** Which roles the current user is allowed to assign when adding a teammate — drives the role picker on "My Team". */
export async function listOwnDepartmentAssignableRoles() {
  const actor = await requirePermission("users.manage_department");
  if (!actor.department) return [];

  const allowedSlugs = DEPARTMENT_TEAM_ROLES[actor.department.code] ?? [];
  if (allowedSlugs.length === 0) return [];

  const headRoleSlug = DEPARTMENT_HEAD_ROLE[actor.department.code];
  const assignableSlugs = headRoleSlug && actor.role.slug !== headRoleSlug ? allowedSlugs.filter((slug) => slug !== headRoleSlug) : allowedSlugs;

  return prisma.role.findMany({ where: { slug: { in: assignableSlugs } }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
}

/** Existing head-role holders in the actor's own department, other than the actor — the pool a successor can be picked from. Empty (not an error) if the department has no defined head role or no other eligible teammate yet. */
export async function listSuccessionCandidates() {
  const actor = await requirePermission("users.manage_department");
  if (!actor.department) return [];

  const headRoleSlug = DEPARTMENT_HEAD_ROLE[actor.department.code];
  if (!headRoleSlug || actor.role.slug !== headRoleSlug) return [];

  return prisma.user.findMany({
    where: { departmentId: actor.department.id, status: "ACTIVE", id: { not: actor.id } },
    select: { id: true, firstName: true, lastName: true, role: { select: { name: true, slug: true } } },
    orderBy: { firstName: "asc" },
  });
}

/**
 * "Leave & appoint a successor" — only the current head can do this, only
 * for a department with a defined DEPARTMENT_HEAD_ROLE, and only to an
 * existing teammate already in the same department (never a role from
 * elsewhere). Promotes the successor to the head role and deactivates the
 * outgoing head's own account, in one transaction so the department is
 * never left with two heads or, briefly, zero.
 */
export async function succeedDepartmentHead(successorUserId: string) {
  const actor = await requirePermission("users.manage_department");
  if (!actor.department) {
    throw new Error("Your account isn't linked to a department yet — ask ICT to set that up first.");
  }

  const headRoleSlug = DEPARTMENT_HEAD_ROLE[actor.department.code];
  if (!headRoleSlug || actor.role.slug !== headRoleSlug) {
    throw new Error("Only the current department head can hand off this role.");
  }

  const successor = await prisma.user.findUnique({ where: { id: successorUserId } });
  if (!successor || successor.departmentId !== actor.department.id || successor.status !== "ACTIVE") {
    throw new Error("Choose an active teammate already in your department.");
  }

  const headRole = await prisma.role.findUniqueOrThrow({ where: { slug: headRoleSlug } });

  await prisma.$transaction([
    prisma.user.update({ where: { id: successor.id }, data: { roleId: headRole.id, reportingToId: null } }),
    prisma.user.update({ where: { id: actor.id }, data: { status: "INACTIVE" } }),
  ]);

  await recordAudit({
    userId: actor.id,
    action: "user.department_head_succession",
    entityType: "User",
    entityId: successor.id,
    previousValue: { headUserId: actor.id },
    newValue: { headUserId: successor.id },
  });
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const actor = await requirePermission("users.manage");
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("User not found");

  const user = await prisma.user.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ? input.email.trim().toLowerCase() : undefined,
      phone: input.phone || undefined,
      jobTitle: input.jobTitle || undefined,
      roleId: input.roleId,
      departmentId: cleanId(input.departmentId),
      businessUnitId: cleanId(input.businessUnitId),
      reportingToId: cleanId(input.reportingToId),
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "user.updated",
    entityType: "User",
    entityId: user.id,
    previousValue: { email: before.email, roleId: before.roleId, departmentId: before.departmentId },
    newValue: { email: user.email, roleId: user.roleId, departmentId: user.departmentId },
  });

  return getUserById(id);
}

export async function setUserStatus(id: string, status: UserStatus) {
  const actor = await requirePermission("users.manage");
  if (actor.id === id && status !== "ACTIVE") {
    throw new Error("You cannot deactivate your own account.");
  }
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("User not found");

  const user = await prisma.user.update({ where: { id }, data: { status } });

  await recordAudit({
    userId: actor.id,
    action: "user.status_changed",
    entityType: "User",
    entityId: id,
    previousValue: { status: before.status },
    newValue: { status: user.status },
  });

  return getUserById(id);
}

export async function resetUserPassword(id: string) {
  const actor = await requirePermission("users.manage");
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await recordAudit({ userId: actor.id, action: "user.password_reset", entityType: "User", entityId: id });
  return { tempPassword };
}

export async function getOwnProfile() {
  const user = await requireAuth();
  return getFullProfile(user.id);
}

export async function updateOwnContactDetails(phone: string) {
  const user = await requireAuth();
  await prisma.user.update({ where: { id: user.id }, data: { phone: phone || undefined } });
  await recordAudit({ userId: user.id, action: "user.updated_own_profile", entityType: "User", entityId: user.id });
  return getFullProfile(user.id);
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const user = await requireAuth();
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const valid = await verifyPassword(currentPassword, record.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await recordAudit({ userId: user.id, action: "user.changed_own_password", entityType: "User", entityId: user.id });
}

async function getFullProfile(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
      department: true,
      businessUnit: true,
      reportingTo: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
    },
  });
}
