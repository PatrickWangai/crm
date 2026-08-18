import { notFound } from "next/navigation";
import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { getRoleDetail, listAllPermissions } from "@/lib/services/role.service";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PermissionMatrix } from "@/components/admin/roles/permission-matrix";

export default async function RoleDetailPage({ params }: { params: Promise<{ roleId: string }> }) {
  await requirePermissionOrRedirect("roles.manage");
  const { roleId } = await params;

  const [role, permissions] = await Promise.all([getRoleDetail(roleId), listAllPermissions()]);
  if (!role) notFound();

  return (
    <div>
      <PageHeader
        title={role.name}
        description={role.description ?? "Configure which modules and actions this role can access."}
        breadcrumbs={[{ label: "Administration" }, { label: "Roles & Permissions", href: "/admin/roles" }, { label: role.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={role.isSystem ? "secondary" : "info"}>{role.isSystem ? "Blueprint role" : "Custom role"}</Badge>
            <Badge variant="outline">{role._count.users} users</Badge>
          </div>
        }
      />
      <PermissionMatrix roleId={role.id} permissions={permissions} initialGrantedIds={Array.from(role.grantedPermissionIds)} />
    </div>
  );
}
