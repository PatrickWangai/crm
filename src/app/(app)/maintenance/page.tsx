import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listMaintenanceRequests, listMaintenanceForBoard } from "@/lib/services/maintenance.service";
import { listPropertyOptions, listUnitOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { MaintenanceFormSheet } from "@/components/maintenance/maintenance-form-sheet";
import { MaintenanceKanban } from "@/components/maintenance/maintenance-kanban";
import type { JobCardStatus } from "@prisma/client";
import { Wrench } from "lucide-react";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["maintenance.view_all"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = typeof sp.status === "string" ? (sp.status as JobCardStatus) : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;
  const view = sp.view === "kanban" ? "kanban" : "table";

  const [properties, units, staff] = await Promise.all([listPropertyOptions(), listUnitOptions(), listUserOptions()]);
  const canManage = hasPermission(user, "maintenance.manage");

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Job cards for property and unit repairs."
        actions={canManage ? <MaintenanceFormSheet properties={properties} units={units} staff={staff} /> : undefined}
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <MaintenanceFilters view={view} />

        {view === "kanban" ? <KanbanSection q={q} /> : <TableSection q={q} status={status} page={page} />}
      </div>
    </div>
  );
}

async function TableSection({ q, status, page }: { q?: string; status?: JobCardStatus; page: number }) {
  const { data: requests, total, pageCount } = await listMaintenanceRequests({ q, status, page });

  if (requests.length === 0) {
    return <EmptyState icon={Wrench} title="No job cards found" description="Try adjusting your filters, or log a new job card." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job card</TableHead>
            <TableHead>Property / Unit</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => (
            <TableRow key={req.id}>
              <TableCell>
                <Link href={`/maintenance/${req.id}`} className="hover:text-primary">
                  <p className="truncate text-sm font-medium">{req.issueDescription}</p>
                  <p className="text-xs text-muted-foreground">{req.jobCardNumber}</p>
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {req.property.name}
                {req.unit && ` · Unit ${req.unit.unitNumber}`}
              </TableCell>
              <TableCell>
                <StatusBadge status={req.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={req.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {req.assignedTo ? `${req.assignedTo.firstName} ${req.assignedTo.lastName}` : "Unassigned"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageCount={pageCount} total={total} />
    </>
  );
}

async function KanbanSection({ q }: { q?: string }) {
  const requests = await listMaintenanceForBoard();
  const filtered = requests.filter((req) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    const haystack = `${req.issueDescription} ${req.jobCardNumber}`.toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <MaintenanceKanban
      requests={filtered.map((req) => ({
        id: req.id,
        jobCardNumber: req.jobCardNumber,
        issueDescription: req.issueDescription,
        priority: req.priority,
        status: req.status,
        property: req.property,
        unit: req.unit,
        assignedTo: req.assignedTo,
      }))}
    />
  );
}
