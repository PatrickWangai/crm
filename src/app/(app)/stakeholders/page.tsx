import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listStakeholders } from "@/lib/services/stakeholder.service";
import { listBusinessUnitOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { StakeholderFilters } from "@/components/stakeholders/stakeholder-filters";
import { StakeholderFormSheet } from "@/components/stakeholders/stakeholder-form-sheet";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { importStakeholdersAction } from "@/app/(app)/stakeholders/actions";
import { initials } from "@/lib/utils";
import { Contact } from "lucide-react";
import type { StakeholderType } from "@prisma/client";

export default async function StakeholdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["stakeholders.view_all", "stakeholders.view_own"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const type = typeof sp.type === "string" ? (sp.type as StakeholderType) : undefined;
  const businessUnitId = typeof sp.businessUnitId === "string" ? sp.businessUnitId : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const [{ data: stakeholders, total, pageCount }, businessUnits, staff] = await Promise.all([
    listStakeholders({ q, type, businessUnitId, page }),
    listBusinessUnitOptions(),
    listUserOptions(),
  ]);

  const canCreate = hasPermission(user, "stakeholders.create");
  const scoped = !hasPermission(user, "stakeholders.view_all");

  return (
    <div>
      <PageHeader
        title="Stakeholders"
        description={
          scoped
            ? `${total} stakeholder${total === 1 ? "" : "s"} assigned to you`
            : `${total} stakeholder${total === 1 ? "" : "s"} across the organization`
        }
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <CsvImportDialog
                title="Bulk import stakeholders"
                description="Create multiple stakeholder profiles at once from a CSV file."
                templateHeaders={[
                  "type",
                  "firstName",
                  "lastName",
                  "organization",
                  "email",
                  "phone",
                  "alternatePhone",
                  "address",
                  "city",
                  "idNumber",
                  "kraPin",
                  "businessUnitCode",
                  "assignedStaffEmail",
                ]}
                templateExample={[
                  [
                    "CUSTOMER",
                    "Jane",
                    "Doe",
                    "",
                    "jane.doe@example.com",
                    "+254700000000",
                    "",
                    "123 Example Rd",
                    "Nairobi",
                    "",
                    "",
                    "MRE",
                    "sales-marketing@masterways.co.ke",
                  ],
                ]}
                action={importStakeholdersAction}
              />
              <StakeholderFormSheet mode="create" businessUnits={businessUnits} staff={staff} redirectOnCreate />
            </div>
          ) : undefined
        }
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <StakeholderFilters businessUnits={businessUnits} />

        {stakeholders.length === 0 ? (
          <EmptyState
            icon={Contact}
            title="No stakeholders found"
            description={
              scoped
                ? "No stakeholders are currently assigned to you, or none match your filters."
                : "Try adjusting your filters, or add the first stakeholder profile."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Business unit</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stakeholders.map((sh) => (
                <TableRow key={sh.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/stakeholders/${sh.id}`} className="flex items-center gap-3 hover:text-primary">
                      <Avatar>
                        <AvatarFallback>{initials(sh.firstName, sh.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {sh.firstName} {sh.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{sh.code}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={sh.type} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <p>{sh.email ?? "—"}</p>
                    <p>{sh.phone ?? ""}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sh.businessUnit?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sh.assignedStaff ? `${sh.assignedStaff.firstName} ${sh.assignedStaff.lastName}` : "Unassigned"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {sh._count.tickets} tickets &middot; {sh._count.leads} leads &middot; {sh._count.documents} docs
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
