import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listTickets, listTicketsForBoard } from "@/lib/services/ticket.service";
import { listBusinessUnitOptions, listTicketDepartmentOptions, listStakeholderOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketFormSheet } from "@/components/tickets/ticket-form-sheet";
import { TicketKanban } from "@/components/tickets/ticket-kanban";
import { CheckSlaRiskButton } from "@/components/tickets/check-sla-risk-button";
import { RoutingCheckIcon } from "@/components/tickets/routing-check";
import { checkRouting } from "@/lib/services/department-routing";
import { initials } from "@/lib/utils";
import { Ticket as TicketIcon } from "lucide-react";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["tickets.view_all", "tickets.view_own"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = typeof sp.status === "string" ? (sp.status as TicketStatus) : undefined;
  const priority = typeof sp.priority === "string" ? (sp.priority as TicketPriority) : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;
  const view = sp.view === "kanban" ? "kanban" : "table";

  const [stakeholders, businessUnits, departments, staff] = await Promise.all([
    listStakeholderOptions(),
    listBusinessUnitOptions(),
    listTicketDepartmentOptions(),
    listUserOptions(),
  ]);
  const canCreate = hasPermission(user, "tickets.create");

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Track and resolve customer service requests against SLA targets."
        actions={
          <div className="flex items-center gap-2">
            {hasPermission(user, "tickets.assign") && <CheckSlaRiskButton />}
            {canCreate && (
              <TicketFormSheet mode="create" stakeholders={stakeholders} businessUnits={businessUnits} departments={departments} staff={staff} redirectOnCreate />
            )}
          </div>
        }
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <TicketFilters view={view} />

        {view === "kanban" ? (
          <KanbanSection priority={priority} category={category} q={q} />
        ) : (
          <TableSection q={q} status={status} priority={priority} category={category} page={page} />
        )}
      </div>
    </div>
  );
}

async function TableSection({
  q,
  status,
  priority,
  category,
  page,
}: {
  q?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  page: number;
}) {
  const { data: tickets, total, pageCount } = await listTickets({ q, status, priority, category, page });

  if (tickets.length === 0) {
    return <EmptyState icon={TicketIcon} title="No tickets found" description="Try adjusting your filters, or log a new ticket." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Stakeholder</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Assigned to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <Link href={`/tickets/${ticket.id}`} className="hover:text-primary">
                  <p className="truncate text-sm font-medium">{ticket.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ticket.ticketNumber} &middot; {ticket.category}
                  </p>
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>{ticket.department?.name ?? "—"}</span>
                  <RoutingCheckIcon check={checkRouting(ticket.department?.code ?? null, ticket.category, ticket.subject, ticket.description, ticket.businessUnit?.code ?? null)} />
                </div>
              </TableCell>
              <TableCell>
                <Link href={`/stakeholders/${ticket.stakeholder.id}`} className="flex items-center gap-2 text-sm hover:text-primary">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initials(ticket.stakeholder.firstName, ticket.stakeholder.lastName)}</AvatarFallback>
                  </Avatar>
                  {ticket.stakeholder.firstName} {ticket.stakeholder.lastName}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={ticket.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <SlaBadge dueAt={ticket.dueAt} status={ticket.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : "Unassigned"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageCount={pageCount} total={total} />
    </>
  );
}

async function KanbanSection({ q, priority, category }: { q?: string; priority?: TicketPriority; category?: string }) {
  const tickets = await listTicketsForBoard();
  const filtered = tickets.filter((ticket) => {
    if (priority && ticket.priority !== priority) return false;
    if (category && ticket.category !== category) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = `${ticket.subject} ${ticket.ticketNumber} ${ticket.stakeholder.firstName} ${ticket.stakeholder.lastName}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return (
    <TicketKanban
      tickets={filtered.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        dueAt: ticket.dueAt,
        stakeholder: ticket.stakeholder,
        assignedTo: ticket.assignedTo,
      }))}
    />
  );
}
