import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listLeases } from "@/lib/services/lease.service";
import { listStakeholderOptions, listVacantUnitOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { LeaseFilters } from "@/components/leases/lease-filters";
import { LeaseFormSheet } from "@/components/leases/lease-form-sheet";
import { CheckExpiringLeasesButton } from "@/components/leases/check-expiring-leases-button";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { importLeasesAction } from "@/app/(app)/leases/actions";
import { formatCurrency } from "@/lib/utils";
import type { LeaseStatus } from "@prisma/client";
import { FileSignature } from "lucide-react";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["leases.view_all"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = typeof sp.status === "string" ? (sp.status as LeaseStatus) : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const [{ data: leases, total, pageCount }, vacantUnits, stakeholders] = await Promise.all([
    listLeases({ q, status, page }),
    listVacantUnitOptions(),
    listStakeholderOptions(),
  ]);
  const canManage = hasPermission(user, "leases.manage");

  return (
    <div>
      <PageHeader
        title="Leases"
        description="Tenancy agreements linking tenants to units."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <CheckExpiringLeasesButton />
              <CsvImportDialog
                title="Bulk import leases"
                description="Start multiple leases at once, referencing an existing unit and tenant by their codes."
                templateHeaders={["unitCode", "tenantCode", "landlordCode", "startDate", "endDate", "rentAmount", "depositAmount"]}
                templateExample={[["UNIT-000001", "STK-000001", "", "2026-01-01", "2026-12-31", "85000", "85000"]]}
                action={importLeasesAction}
              />
              <LeaseFormSheet units={vacantUnits} tenants={stakeholders} landlords={stakeholders} />
            </div>
          ) : undefined
        }
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <LeaseFilters />

        {leases.length === 0 ? (
          <EmptyState icon={FileSignature} title="No leases found" description="Try adjusting your filters, or start a new lease." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lease</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>
                      <Link href={`/leases/${lease.id}`} className="hover:text-primary">
                        <p className="text-sm font-medium">{lease.code}</p>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lease.unit.property.name} · Unit {lease.unit.unitNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lease.tenant.firstName} {lease.tenant.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lease.startDate).toLocaleDateString()} – {new Date(lease.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(Number(lease.rentAmount))}</TableCell>
                    <TableCell>
                      <StatusBadge status={lease.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
