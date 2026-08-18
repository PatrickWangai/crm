import Link from "next/link";
import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { listRoles } from "@/lib/services/role.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRoleSheet } from "@/components/admin/roles/create-role-sheet";
import { DeleteRoleButton } from "@/components/admin/roles/delete-role-button";
import { ChevronRight } from "lucide-react";

export default async function RolesPage() {
  await requirePermissionOrRedirect("roles.manage");
  const roles = await listRoles();

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description={`${roles.length} roles configured. Select a role to view or edit its module permissions.`}
        breadcrumbs={[{ label: "Administration" }, { label: "Roles & Permissions" }]}
        actions={<CreateRoleSheet />}
      />

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Permissions granted</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/admin/roles/${role.id}`} className="flex items-center gap-2 font-medium hover:text-primary">
                    {role.name}
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                  {role.description && <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant={role.isSystem ? "secondary" : "info"}>{role.isSystem ? "Blueprint role" : "Custom"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{role._count.rolePermissions} permissions</TableCell>
                <TableCell className="text-muted-foreground">{role._count.users}</TableCell>
                <TableCell>
                  {!role.isSystem && (
                    <div className="flex justify-end">
                      <DeleteRoleButton roleId={role.id} name={role.name} userCount={role._count.users} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
