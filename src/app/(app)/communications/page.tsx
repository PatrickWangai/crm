import Link from "next/link";
import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { listCommunications } from "@/lib/services/communication.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { CommunicationFilters } from "@/components/communications/communication-filters";
import { formatDistanceToNow } from "date-fns";
import type { CommunicationChannel, CommunicationDirection } from "@prisma/client";
import { MessageSquare } from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  NOTE: "Note",
  WALK_IN: "Walk-in",
};

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermissionOrRedirect(["communications.view_all", "communications.view_own"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const channel = typeof sp.channel === "string" ? (sp.channel as CommunicationChannel) : undefined;
  const direction = typeof sp.direction === "string" ? (sp.direction as CommunicationDirection) : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const { data: communications, total, pageCount } = await listCommunications({ q, channel, direction, page });

  return (
    <div>
      <PageHeader title="Communications" description="Every call, email, SMS, WhatsApp message and note logged across the CRM." />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <CommunicationFilters />

        {communications.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No communications found" description="Try adjusting your filters." />
        ) : (
          <>
            <ul className="space-y-3">
              {communications.map((comm) => {
                const related = comm.stakeholder
                  ? { href: `/stakeholders/${comm.stakeholder.id}`, label: `${comm.stakeholder.firstName} ${comm.stakeholder.lastName}` }
                  : comm.relatedLead
                    ? { href: `/leads/${comm.relatedLead.id}`, label: `${comm.relatedLead.firstName} ${comm.relatedLead.lastName}` }
                    : comm.relatedTicket
                      ? { href: `/tickets/${comm.relatedTicket.id}`, label: comm.relatedTicket.subject }
                      : null;
                return (
                  <li key={comm.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                    <Badge variant={comm.direction === "INBOUND" ? "info" : "secondary"} className="mt-0.5 shrink-0">
                      {CHANNEL_LABELS[comm.channel]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      {comm.subject && <p className="text-sm font-medium">{comm.subject}</p>}
                      <p className="text-sm text-muted-foreground">{comm.content}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {comm.direction === "INBOUND" ? "Received" : "Sent"} by {comm.staff ? `${comm.staff.firstName} ${comm.staff.lastName}` : "—"} &middot;{" "}
                        {formatDistanceToNow(new Date(comm.occurredAt), { addSuffix: true })}
                        {related && (
                          <>
                            &middot;{" "}
                            <Link href={related.href} className="text-primary hover:underline">
                              {related.label}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination page={page} pageCount={pageCount} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
