import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { listSLAs } from "@/lib/services/sla.service";
import { listBusinessUnitOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { SlaFormSheet } from "@/components/admin/sla/sla-form-sheet";
import { DeleteSlaButton } from "@/components/admin/sla/delete-sla-button";
import { Timer } from "lucide-react";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)}h`;
  return `${(minutes / 1440).toFixed(minutes % 1440 === 0 ? 0 : 1)}d`;
}

export default async function SlaAdminPage() {
  await requireAnyPermissionOrRedirect(["settings.manage"]);
  const [policies, businessUnits] = await Promise.all([listSLAs(), listBusinessUnitOptions()]);

  return (
    <div>
      <PageHeader
        title="SLA Policies"
        description="Response and resolution targets applied automatically to new tickets by priority."
        actions={<SlaFormSheet mode="create" businessUnits={businessUnits} />}
      />

      <div className="rounded-lg border border-border bg-card p-4">
        {policies.length === 0 ? (
          <EmptyState icon={Timer} title="No SLA policies configured" description="Add a policy to start applying resolution targets to tickets." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Business unit</TableHead>
                <TableHead>Response target</TableHead>
                <TableHead>Resolution target</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((sla) => (
                <TableRow key={sla.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{sla.name}</p>
                    {sla.category && <p className="text-xs text-muted-foreground">{sla.category}</p>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={sla.priority} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sla.businessUnit?.name ?? "Global"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatMinutes(sla.responseTimeMinutes)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatMinutes(sla.resolutionTimeMinutes)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sla._count.tickets}</TableCell>
                  <TableCell>
                    <Badge variant={sla.isActive ? "success" : "outline"}>{sla.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <SlaFormSheet
                        mode="edit"
                        slaId={sla.id}
                        businessUnits={businessUnits}
                        defaultValues={{
                          name: sla.name,
                          businessUnitId: sla.businessUnitId,
                          category: sla.category,
                          priority: sla.priority,
                          responseTimeMinutes: sla.responseTimeMinutes,
                          resolutionTimeMinutes: sla.resolutionTimeMinutes,
                          isActive: sla.isActive,
                        }}
                      />
                      <DeleteSlaButton slaId={sla.id} name={sla.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
