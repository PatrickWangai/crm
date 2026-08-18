import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listLeads, listLeadsForBoard } from "@/lib/services/lead.service";
import { listBusinessUnitOptions, listPropertyOptions, listUnitOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadFormSheet } from "@/components/leads/lead-form-sheet";
import { LeadKanban } from "@/components/leads/lead-kanban";
import { CheckFollowUpsButton } from "@/components/leads/check-follow-ups-button";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { importLeadsAction } from "@/app/(app)/leads/actions";
import { initials } from "@/lib/utils";
import { Users2 } from "lucide-react";
import type { LeadSource, LeadStatus } from "@prisma/client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["leads.view_all", "leads.view_own"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = typeof sp.status === "string" ? (sp.status as LeadStatus) : undefined;
  const source = typeof sp.source === "string" ? (sp.source as LeadSource) : undefined;
  const businessUnitId = typeof sp.businessUnitId === "string" ? sp.businessUnitId : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;
  const view = sp.view === "kanban" ? "kanban" : "table";

  const [businessUnits, staff, properties, units] = await Promise.all([
    listBusinessUnitOptions(),
    listUserOptions(),
    listPropertyOptions(),
    listUnitOptions(),
  ]);
  const canCreate = hasPermission(user, "leads.create");

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Capture prospects and move them through the sales pipeline."
        actions={
          <div className="flex items-center gap-2">
            {hasPermission(user, "leads.assign") && <CheckFollowUpsButton />}
            {canCreate && (
              <CsvImportDialog
                title="Bulk import leads"
                description="Capture multiple leads at once from a CSV file."
                templateHeaders={[
                  "firstName",
                  "lastName",
                  "email",
                  "phone",
                  "source",
                  "sourceDetail",
                  "requirements",
                  "businessUnitCode",
                  "assignedToEmail",
                  "interestedPropertyCode",
                  "interestedUnitCode",
                ]}
                templateExample={[
                  [
                    "Peter",
                    "Mwaura",
                    "peter.mwaura@example.com",
                    "+254722334455",
                    "WEBSITE",
                    "",
                    "3BR apartment in Kilimani",
                    "MRE",
                    "faith.njoki@masterways.co.ke",
                    "",
                    "",
                  ],
                ]}
                action={importLeadsAction}
              />
            )}
            {canCreate && (
              <LeadFormSheet mode="create" businessUnits={businessUnits} staff={staff} properties={properties} units={units} redirectOnCreate />
            )}
          </div>
        }
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <LeadFilters businessUnits={businessUnits} view={view} />

        {view === "kanban" ? (
          <KanbanSection q={q} source={source} businessUnitId={businessUnitId} />
        ) : (
          <TableSection q={q} status={status} source={source} businessUnitId={businessUnitId} page={page} />
        )}
      </div>
    </div>
  );
}

async function TableSection({
  q,
  status,
  source,
  businessUnitId,
  page,
}: {
  q?: string;
  status?: LeadStatus;
  source?: LeadSource;
  businessUnitId?: string;
  page: number;
}) {
  const { data: leads, total, pageCount } = await listLeads({ q, status, source, businessUnitId, page });

  if (leads.length === 0) {
    return <EmptyState icon={Users2} title="No leads found" description="Try adjusting your filters, or add a new lead." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Next follow-up</TableHead>
            <TableHead>Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 hover:text-primary">
                  <Avatar>
                    <AvatarFallback>{initials(lead.firstName, lead.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{lead.code}</p>
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{lead.source.replace(/_/g, " ")}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : "Unassigned"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {lead._count.communications} interactions &middot; {lead._count.documents} docs
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageCount={pageCount} total={total} />
    </>
  );
}

async function KanbanSection({ q, source, businessUnitId }: { q?: string; source?: LeadSource; businessUnitId?: string }) {
  const leads = await listLeadsForBoard();
  const filtered = leads.filter((lead) => {
    if (source && lead.source !== source) return false;
    if (businessUnitId && lead.businessUnitId !== businessUnitId) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = `${lead.firstName} ${lead.lastName} ${lead.email ?? ""} ${lead.phone ?? ""} ${lead.code}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return (
    <LeadKanban
      leads={filtered.map((lead) => ({
        id: lead.id,
        code: lead.code,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        nextFollowUpAt: lead.nextFollowUpAt,
        assignedTo: lead.assignedTo,
      }))}
    />
  );
}
