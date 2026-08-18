import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { getTicketDetail } from "@/lib/services/ticket.service";
import { listBusinessUnitOptions, listDepartmentOptions, listStakeholderOptions, listUserOptions } from "@/lib/services/lookups.service";
import {
  logTicketCommunicationAction,
  uploadTicketDocumentAction,
  deleteTicketDocumentAction,
  createTicketTaskAction,
} from "@/app/(app)/tickets/actions";
import { RelatedTaskList } from "@/components/tasks/related-task-list";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketFormSheet } from "@/components/tickets/ticket-form-sheet";
import { DeleteTicketButton } from "@/components/tickets/delete-ticket-button";
import { TicketStatusControl } from "@/components/tickets/ticket-status-control";
import { AssignTicketSelect } from "@/components/tickets/assign-ticket-select";
import { TicketCommentForm } from "@/components/tickets/ticket-comment-form";
import { LogCommunicationForm } from "@/components/communications/log-communication-form";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { Mail, Phone, Building2, FileText, MessageSquare, MessageSquareText, Download, User as UserIcon, Lock } from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  NOTE: "Note",
  WALK_IN: "Walk-in",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["tickets.view_all", "tickets.view_own"]);
  const { id } = await params;

  let ticket: Awaited<ReturnType<typeof getTicketDetail>>;
  let stakeholders: Awaited<ReturnType<typeof listStakeholderOptions>>;
  let businessUnits: Awaited<ReturnType<typeof listBusinessUnitOptions>>;
  let departments: Awaited<ReturnType<typeof listDepartmentOptions>>;
  let staff: Awaited<ReturnType<typeof listUserOptions>>;
  try {
    [ticket, stakeholders, businessUnits, departments, staff] = await Promise.all([
      getTicketDetail(id),
      listStakeholderOptions(),
      listBusinessUnitOptions(),
      listDepartmentOptions(),
      listUserOptions(),
    ]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/forbidden");
    throw err;
  }
  if (!ticket) notFound();

  const canUpdate = hasPermission(user, "tickets.update");
  const canDelete = hasPermission(user, "tickets.delete");
  const canAssign = hasPermission(user, "tickets.assign");
  const canLogCommunication = hasPermission(user, "communications.create");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");
  const canCreateTask = hasPermission(user, "tasks.create");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={ticket.subject}
        breadcrumbs={[{ label: "Tickets", href: "/tickets" }, { label: ticket.ticketNumber }]}
        actions={canDelete ? <DeleteTicketButton ticketId={ticket.id} subject={ticket.subject} /> : undefined}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquareText className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{ticket.ticketNumber}</h2>
                <StatusBadge status={ticket.status} />
                <StatusBadge status={ticket.priority} />
                <SlaBadge dueAt={ticket.dueAt} status={ticket.status} />
              </div>
              <Link href={`/stakeholders/${ticket.stakeholder.id}`} className="mt-1 text-sm text-muted-foreground hover:text-primary hover:underline">
                {ticket.stakeholder.firstName} {ticket.stakeholder.lastName} ({ticket.stakeholder.code})
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && <TicketStatusControl ticketId={ticket.id} currentStatus={ticket.status} />}
            {canUpdate && (
              <TicketFormSheet
                mode="edit"
                ticketId={ticket.id}
                stakeholders={stakeholders}
                businessUnits={businessUnits}
                departments={departments}
                staff={staff}
                defaultValues={{
                  stakeholderId: ticket.stakeholderId,
                  subject: ticket.subject,
                  description: ticket.description,
                  category: ticket.category,
                  priority: ticket.priority,
                  businessUnitId: ticket.businessUnitId,
                  departmentId: ticket.departmentId,
                  assignedToId: ticket.assignedToId,
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Request details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">{ticket.description}</p>
              <InfoRow icon={Mail} label="Stakeholder email" value={ticket.stakeholder.email ?? "—"} />
              <InfoRow icon={Phone} label="Stakeholder phone" value={ticket.stakeholder.phone ?? "—"} />
              <InfoRow icon={Building2} label="Business unit" value={ticket.businessUnit?.name ?? "—"} />
              <InfoRow icon={Building2} label="Department" value={ticket.department?.name ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment &amp; SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="size-4" /> Assigned to
                </span>
                {canAssign ? (
                  <AssignTicketSelect ticketId={ticket.id} staff={staff} currentAssigneeId={ticket.assignedToId} />
                ) : (
                  <span className="font-medium">{ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : "Unassigned"}</span>
                )}
              </div>
              <InfoRow icon={FileText} label="SLA policy" value={ticket.sla?.name ?? "None applied"} />
              <InfoRow icon={FileText} label="Due" value={ticket.dueAt ? new Date(ticket.dueAt).toLocaleString() : "—"} />
              <InfoRow icon={FileText} label="Logged" value={formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })} />
              {ticket.resolvedAt && <InfoRow icon={FileText} label="Resolved" value={new Date(ticket.resolvedAt).toLocaleString()} />}
              {ticket.closedAt && <InfoRow icon={FileText} label="Closed" value={new Date(ticket.closedAt).toLocaleString()} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>Internal notes and status updates on this ticket.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdate && <TicketCommentForm ticketId={ticket.id} />}
              {ticket.comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No comments yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-3">
                  {ticket.comments.map((c) => (
                    <li key={c.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{c.user ? `${c.user.firstName} ${c.user.lastName}` : "System"}</p>
                        <div className="flex items-center gap-2">
                          {c.isInternal && (
                            <Badge variant="outline" className="text-[10px]">
                              <Lock className="size-3" /> Internal
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications */}
        <TabsContent value="communications">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Communication history</CardTitle>
                <CardDescription>Calls, emails, SMS, WhatsApp, meetings and notes tied to this ticket.</CardDescription>
              </div>
              {canLogCommunication && (
                <LogCommunicationForm
                  action={logTicketCommunicationAction.bind(null, ticket.id)}
                  description="Record a call, email, meeting or other touchpoint for this ticket."
                />
              )}
            </CardHeader>
            <CardContent>
              {ticket.communications.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No communications logged yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-4">
                  {ticket.communications.map((comm) => (
                    <li key={comm.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                      <Badge variant={comm.direction === "INBOUND" ? "info" : "secondary"} className="mt-0.5 shrink-0">
                        {CHANNEL_LABELS[comm.channel]}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        {comm.subject && <p className="text-sm font-medium">{comm.subject}</p>}
                        <p className="text-sm text-muted-foreground">{comm.content}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {comm.direction === "INBOUND" ? "Received" : "Sent"} by {comm.staff ? `${comm.staff.firstName} ${comm.staff.lastName}` : "—"}{" "}
                          &middot; {formatDistanceToNow(new Date(comm.occurredAt), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Attachments and correspondence for this ticket.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload && <UploadDocumentForm action={uploadTicketDocumentAction.bind(null, ticket.id)} />}
              {ticket.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {ticket.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(doc.fileSizeBytes)} &middot; uploaded {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                            {doc.uploadedBy && ` by ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                          <button className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                            <Download className="size-4" />
                          </button>
                        </a>
                        {canDeleteDocs && (
                          <DeleteDocumentButton fileName={doc.fileName} deleteAction={deleteTicketDocumentAction.bind(null, doc.id, ticket.id)} />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <RelatedTaskList
            tasks={ticket.tasks}
            canCreate={canCreateTask}
            staff={staff}
            departments={departments}
            createAction={createTicketTaskAction.bind(null, ticket.id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
