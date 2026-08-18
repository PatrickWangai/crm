import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { listDepartments } from "@/lib/services/org.service";
import { listBusinessUnitOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { DepartmentFormSheet } from "@/components/admin/departments/department-form-sheet";
import { DeleteDepartmentButton } from "@/components/admin/departments/delete-department-button";
import { Building2 } from "lucide-react";

export default async function DepartmentsPage() {
  await requirePermissionOrRedirect("departments.manage");
  const [departments, businessUnits] = await Promise.all([listDepartments(), listBusinessUnitOptions()]);

  return (
    <div>
      <PageHeader
        title="Departments"
        description={`${departments.length} department${departments.length === 1 ? "" : "s"}`}
        breadcrumbs={[{ label: "Administration" }, { label: "Departments" }]}
        actions={<DepartmentFormSheet mode="create" businessUnits={businessUnits} />}
      />

      <Card className="p-4">
        {departments.length === 0 ? (
          <EmptyState icon={Building2} title="No departments yet" description="Add your first department to start assigning staff." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Business unit</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{dept.code}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{dept.businessUnit?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{dept._count.users}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <DepartmentFormSheet
                        mode="edit"
                        departmentId={dept.id}
                        businessUnits={businessUnits}
                        defaultValues={{ name: dept.name, code: dept.code, businessUnitId: dept.businessUnitId }}
                      />
                      <DeleteDepartmentButton departmentId={dept.id} name={dept.name} userCount={dept._count.users} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
