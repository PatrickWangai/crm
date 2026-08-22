import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { getTicketDetail } from "@/lib/services/ticket.service";
import { checkRouting } from "@/lib/services/department-routing";
import {
  listBusinessUnitOptions,
  listDepartmentOptions,
  listTicketDepartmentOptions,
  listTicketHandlingStaffOptions,
  listStakeholderOptions,
  listUserOptions,
} from "@/lib/services/lookups.service";
import { isAiAssistantEnabled, suggestTicketReply } from "@/lib/services/ai.service";
import {
  logTicketCommunicationAction,
  sendTicketEmailAction,
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
import { TicketWorkflowActions } from "@/components/tickets/ticket-workflow-actions";
import { ForwardTicketDialog } from "@/components/tickets/forward-ticket-dialog";
import { RoutingCheckNote } from "@/components/tickets/routing-check";
import { AssignTicketSelect } from "@/components/tickets/assign-ticket-select";
import { NudgeTicketButton } from "@/components/tickets/nudge-ticket-button";
import { TicketCommentSection } from "@/components/tickets/ticket-comment-section";
import { SendCustomerEmailForm } from "@/components/tickets/send-customer-email-form";
import { QuickContactLinks } from "@/components/tickets/quick-contact-links";
import { CustomerTrackerPreview } from "@/components/tickets/customer-tracker-preview";
import { LogCommunicationForm } from "@/components/communications/log-communication-form";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { DocumentBadges } from "@/components/documents/document-badges";
import { Mail, Phone, Building2, FileText, MessageSquare, MessageSquareText, Download, User as UserIcon, Lock, Bot } from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  NOTE: "Note",
  WALK_IN: "Walk-in",
  CHATBOT: "Chatbot",
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
  let ticketDepartments: Awaited<ReturnType<typeof listTicketDepartmentOptions>>;
  let ticketHandlingStaff: Awaited<ReturnType<typeof listTicketHandlingStaffOptions>>;
  let staff: Awaited<ReturnType<typeof listUserOptions>>;
  let aiEnabled: boolean;
  try {
    [ticket, stakeholders, businessUnits, departments, ticketDepartments, ticketHandlingStaff, staff, aiEnabled] = await Promise.all([
      getTicketDetail(id),
      listStakeholderOptions(),
      listBusinessUnitOptions(),
      listDepartmentOptions(),
      listTicketDepartmentOptions(),
      listTicketHandlingStaffOptions(),
      listUserOptions(),
      isAiAssistantEnabled(),
    ]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/forbidden");
    throw err;
  }
  if (!ticket) notFound();

  const suggestedReply =
    aiEnabled && !["COMPLETED", "CLOSED"].includes(ticket.status)
      ? suggestTicketReply({
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          stakeholderFirstName: ticket.stakeholder.firstName,
          latestPublicComment: ticket.comments.find((c) => !c.isInternal)?.comment ?? null,
        }).text
      : null;

  const routingCheck = await checkRouting(ticket.department?.code ?? null, ticket.category, ticket.subject, ticket.description, ticket.businessUnit?.id ?? null);

  const canUpdate = hasPermission(user, "tickets.update");
  const canDelete = hasPermission(user, "tickets.delete");
  const canAssign = hasPermission(user, "tickets.assign");
  const canLogCommunication = hasPermission(user, "communications.create");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");
  const canCreateTask = hasPermission(user, "tasks.create");

  const emailsSent = ticket.communications.filter((c) => c.channel === "EMAIL" && c.direction === "OUTBOUND");
  const emailsReceived = ticket.communications.filter((c) => c.channel === "EMAIL" && c.direction === "INBOUND");
  const chatbotTurns = ticket.communications.filter((c) => c.channel === "CHATBOT");
  const liveChatTurns = ticket.communications.filter((c) => c.channel === "LIVE_CHAT");
  const otherCommunications = ticket.communications.filter((c) => c.channel !== "EMAIL" && c.channel !== "CHATBOT" && c.channel !== "LIVE_CHAT");

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
            <TicketWorkflowActions ticketId={ticket.id} status={ticket.status} currentUserId={user.id} dueAt={ticket.dueAt} canAssign={canAssign} canUpdate={canUpdate} />
            {canAssign && (
              <ForwardTicketDialog
                ticketId={ticket.id}
                currentDepartmentId={ticket.departmentId}
                currentAssigneeId={ticket.assignedToId}
                businessUnits={businessUnits}
                departments={ticketDepartments}
                staff={ticketHandlingStaff}
              />
            )}
            {canUpdate && <TicketStatusControl ticketId={ticket.id} currentStatus={ticket.status} />}
            {canUpdate && (
              <TicketFormSheet
                mode="edit"
                ticketId={ticket.id}
                stakeholders={stakeholders}
                businessUnits={businessUnits}
                departments={ticketDepartments}
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
          <TabsTrigger value="contact">Contact Customer</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Request details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Subject</p>
                <p className="font-medium">{ticket.subject}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{ticket.description}</p>
              </div>
              <InfoRow icon={Mail} label="Stakeholder email" value={ticket.stakeholder.email ?? "—"} />
              <InfoRow icon={Phone} label="Stakeholder phone" value={ticket.stakeholder.phone ?? "—"} />
              <InfoRow icon={Building2} label="Business unit" value={ticket.businessUnit?.name ?? "—"} />
              <InfoRow icon={Building2} label="Department" value={ticket.department?.name ?? "—"} />
              <RoutingCheckNote check={routingCheck} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Assignment &amp; SLA</CardTitle>
              {canAssign && ticket.dueAt && ticket.status !== "COMPLETED" && ticket.status !== "CLOSED" && <NudgeTicketButton ticketId={ticket.id} />}
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

        {/* Contact Customer */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Where things stand</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerTrackerPreview status={ticket.status} departmentOrBusinessUnitName={ticket.businessUnit?.name ?? null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reach out</CardTitle>
              <CardDescription>Using the contact details this customer submitted themselves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuickContactLinks phone={ticket.stakeholder.phone} />
              {canLogCommunication && <SendCustomerEmailForm action={sendTicketEmailAction.bind(null, ticket.id)} customerEmail={ticket.stakeholder.email} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes &amp; updates</CardTitle>
              <CardDescription>Internal notes stay private; uncheck &quot;Internal&quot; to post something the customer sees on their own tracker.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdate && <TicketCommentSection ticketId={ticket.id} suggestedReply={suggestedReply} />}
              {ticket.comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No notes yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-3">
                  {ticket.comments.map((c) => (
                    <li key={c.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{c.user ? `${c.user.firstName} ${c.user.lastName}` : "System"}</p>
                        <div className="flex items-center gap-2">
                          {c.isInternal ? (
                            <Badge variant="outline" className="text-[10px]">
                              <Lock className="size-3" /> Internal
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Customer sees this
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

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow icon={UserIcon} label="Name" value={`${ticket.stakeholder.firstName} ${ticket.stakeholder.lastName}`} />
              <InfoRow icon={Mail} label="Email" value={ticket.stakeholder.email ?? "—"} />
              <InfoRow icon={Phone} label="Phone" value={ticket.stakeholder.phone ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Emails sent</CardTitle>
                <CardDescription>Outbound messages sent to this customer from this ticket.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <CommunicationList items={emailsSent} emptyText="No emails sent yet." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emails received</CardTitle>
              <CardDescription>Inbound emails logged against this ticket.</CardDescription>
            </CardHeader>
            <CardContent>
              <CommunicationList items={emailsReceived} emptyText="No inbound emails logged yet." />
            </CardContent>
          </Card>

          {chatbotTurns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="size-4" /> Chatbot conversation
                </CardTitle>
                <CardDescription>The exchange that led to this ticket, if it started with the virtual assistant.</CardDescription>
              </CardHeader>
              <CardContent>
                <CommunicationList items={chatbotTurns} emptyText="" />
              </CardContent>
            </Card>
          )}

          {liveChatTurns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-4" /> Live chat
                </CardTitle>
                <CardDescription>The back-and-forth with the customer once this ticket was assigned — also reachable from Live Activity.</CardDescription>
              </CardHeader>
              <CardContent>
                <CommunicationList items={liveChatTurns} emptyText="" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Calls &amp; other communications</CardTitle>
                <CardDescription>Everything logged that isn&apos;t email — calls, SMS, WhatsApp, meetings, walk-ins.</CardDescription>
              </div>
              {canLogCommunication && (
                <LogCommunicationForm
                  action={logTicketCommunicationAction.bind(null, ticket.id)}
                  description="Record a call, SMS, meeting or other touchpoint for this ticket."
                />
              )}
            </CardHeader>
            <CardContent>
              <CommunicationList items={otherCommunications} emptyText="No other communications logged yet." />
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
                          <p className="truncate text-sm font-medium">
                            {doc.fileName} <DocumentBadges version={doc.version} accessLevel={doc.accessLevel} />
                          </p>
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

interface CommunicationItem {
  id: string;
  channel: string;
  direction: string;
  subject: string | null;
  content: string;
  occurredAt: Date;
  staff: { firstName: string; lastName: string } | null;
}

function CommunicationList({ items, emptyText }: { items: CommunicationItem[]; emptyText: string }) {
  if (items.length === 0) {
    return emptyText ? <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p> : null;
  }
  return (
    <ul className="space-y-4">
      {items.map((comm) => (
        <li key={comm.id} className="flex items-start gap-3 rounded-md border border-border p-3">
          <Badge variant={comm.direction === "INBOUND" ? "info" : "secondary"} className="mt-0.5 shrink-0">
            {CHANNEL_LABELS[comm.channel] ?? comm.channel}
          </Badge>
          <div className="min-w-0 flex-1">
            {comm.subject && <p className="text-sm font-medium">{comm.subject}</p>}
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{comm.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {comm.direction === "INBOUND" ? "Received" : "Sent"}
              {comm.staff && ` by ${comm.staff.firstName} ${comm.staff.lastName}`} &middot;{" "}
              {formatDistanceToNow(new Date(comm.occurredAt), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
