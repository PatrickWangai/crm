import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { listUsers } from "@/lib/services/user.service";
import { listBusinessUnitOptions, listDepartmentOptions, listRoleOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { UserFormSheet } from "@/components/admin/users/user-form-sheet";
import { UserFilters } from "@/components/admin/users/user-filters";
import { UserRowActions } from "@/components/admin/users/user-row-actions";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { initials } from "@/lib/utils";
import { Users as UsersIcon } from "lucide-react";
import type { UserStatus } from "@prisma/client";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requirePermissionOrRedirect("users.manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const roleId = typeof sp.roleId === "string" ? sp.roleId : undefined;
  const departmentId = typeof sp.departmentId === "string" ? sp.departmentId : undefined;
  const status = typeof sp.status === "string" ? (sp.status as UserStatus) : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const [{ data: users, total, pageCount }, roles, departments, businessUnits, managers] = await Promise.all([
    listUsers({ q, roleId, departmentId, status, page }),
    listRoleOptions(),
    listDepartmentOptions(),
    listBusinessUnitOptions(),
    listUserOptions(),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${total} user${total === 1 ? "" : "s"} across the organization`}
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={<UserFormSheet mode="create" roles={roles} departments={departments} businessUnits={businessUnits} managers={managers} />}
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <UserFilters roles={roles} departments={departments} />

        {users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Try adjusting your filters, or add a new user to the organization."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Business unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {user.firstName} {user.lastName}
                          {user.id === currentUser.id && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.role.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.department?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.businessUnit?.name ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                  </TableCell>
                  <TableCell>
                    <UserRowActions
                      userId={user.id}
                      status={user.status}
                      isSelf={user.id === currentUser.id}
                      roles={roles}
                      departments={departments}
                      businessUnits={businessUnits}
                      managers={managers.filter((m) => m.id !== user.id)}
                      defaultValues={{
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        phone: user.phone,
                        jobTitle: user.jobTitle,
                        roleId: user.role.id,
                        departmentId: user.department?.id ?? null,
                        businessUnitId: user.businessUnit?.id ?? null,
                        reportingToId: user.reportingToId,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} pageCount={pageCount} total={total} />
      </div>
    </div>
  );
}
