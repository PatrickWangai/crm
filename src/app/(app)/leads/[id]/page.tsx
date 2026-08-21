import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { getLeadDetail } from "@/lib/services/lead.service";
import { listBusinessUnitOptions, listDepartmentOptions, listTicketDepartmentOptions, listPropertyOptions, listUnitOptions, listUserOptions } from "@/lib/services/lookups.service";
import { isAiAssistantEnabled, suggestNextActionForLead } from "@/lib/services/ai.service";
import { AiSuggestionCard } from "@/components/leads/ai-suggestion-card";
import { logLeadCommunicationAction, uploadLeadDocumentAction, deleteLeadDocumentAction, createLeadTaskAction } from "@/app/(app)/leads/actions";
import { RelatedTaskList } from "@/components/tasks/related-task-list";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadFormSheet } from "@/components/leads/lead-form-sheet";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { LeadStatusControl } from "@/components/leads/lead-status-control";
import { ClaimLeadButton } from "@/components/leads/claim-lead-button";
import { AssignLeadSelect } from "@/components/leads/assign-lead-select";
import { AssignLeadDepartmentSelect } from "@/components/leads/assign-lead-department-select";
import { CreateOpportunityDialog } from "@/components/leads/create-opportunity-dialog";
import { OpportunityCard } from "@/components/leads/opportunity-card";
import { LogCommunicationForm } from "@/components/communications/log-communication-form";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { DocumentBadges } from "@/components/documents/document-badges";
import { initials } from "@/lib/utils";
import {
  Mail,
  Phone,
  Building2,
  UserCog,
  FileText,
  MessageSquare,
  Briefcase,
  Activity as ActivityIcon,
  Download,
  Calendar,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  EMAIL: "Email",
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  PROPERTY_INQUIRY: "Property Inquiry",
  CAMPAIGN: "Campaign",
  OTHER: "Other",
};

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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["leads.view_all", "leads.view_own"]);
  const { id } = await params;

  let lead: Awaited<ReturnType<typeof getLeadDetail>>;
  let businessUnits: Awaited<ReturnType<typeof listBusinessUnitOptions>>;
  let staff: Awaited<ReturnType<typeof listUserOptions>>;
  let departments: Awaited<ReturnType<typeof listDepartmentOptions>>;
  let assignableDepartments: Awaited<ReturnType<typeof listTicketDepartmentOptions>>;
  let properties: Awaited<ReturnType<typeof listPropertyOptions>>;
  let units: Awaited<ReturnType<typeof listUnitOptions>>;
  let aiEnabled: boolean;
  try {
    [lead, businessUnits, staff, departments, assignableDepartments, properties, units, aiEnabled] = await Promise.all([
      getLeadDetail(id),
      listBusinessUnitOptions(),
      listUserOptions(),
      listDepartmentOptions(),
      listTicketDepartmentOptions(),
      listPropertyOptions(),
      listUnitOptions(),
      isAiAssistantEnabled(),
    ]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/forbidden");
    throw err;
  }
  if (!lead) notFound();

  const canUpdate = hasPermission(user, "leads.update");
  const canDelete = hasPermission(user, "leads.delete");
  const canAssign = hasPermission(user, "leads.assign");
  const canManageOpportunities = hasPermission(user, "opportunities.manage");
  const canLogCommunication = hasPermission(user, "communications.create");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");
  const canCreateTask = hasPermission(user, "tasks.create");
  const canClaim = !lead.assignedToId && (hasPermission(user, "leads.create") || hasPermission(user, "leads.view_own"));
  const aiSuggestion = aiEnabled ? suggestNextActionForLead(lead) : null;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: `${lead.firstName} ${lead.lastName}` }]}
        actions={canDelete ? <DeleteLeadButton leadId={lead.id} name={`${lead.firstName} ${lead.lastName}`} /> : undefined}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials(lead.firstName, lead.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {lead.firstName} {lead.lastName}
                </h2>
                <StatusBadge status={lead.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {lead.code} &middot; {SOURCE_LABELS[lead.source]}
              </p>
              {lead.convertedStakeholder && (
                <Link
                  href={`/stakeholders/${lead.convertedStakeholder.id}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <LinkIcon className="size-3" /> Converted to stakeholder {lead.convertedStakeholder.code}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canClaim && <ClaimLeadButton leadId={lead.id} />}
            {canUpdate && <LeadStatusControl leadId={lead.id} currentStatus={lead.status} />}
            {canUpdate && (
              <LeadFormSheet
                mode="edit"
                leadId={lead.id}
                businessUnits={businessUnits}
                staff={staff}
                properties={properties}
                units={units}
                defaultValues={{
                  firstName: lead.firstName,
                  lastName: lead.lastName,
                  email: lead.email,
                  phone: lead.phone,
                  source: lead.source,
                  sourceDetail: lead.sourceDetail,
                  requirements: lead.requirements,
                  businessUnitId: lead.businessUnitId,
                  assignedToId: lead.assignedToId,
                  nextFollowUpAt: null,
                  interestedPropertyId: lead.interestedPropertyId,
                  interestedUnitId: lead.interestedUnitId,
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Mail} label="Email" value={lead.email ?? "—"} />
              <InfoRow icon={Phone} label="Phone" value={lead.phone ?? "—"} />
              <InfoRow icon={Building2} label="Business unit" value={lead.businessUnit?.name ?? "—"} />
              <InfoRow icon={Calendar} label="Next follow-up" value={lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserCog className="size-4" /> Assigned agent
                </span>
                {canAssign ? (
                  <AssignLeadSelect leadId={lead.id} staff={staff} currentAssigneeId={lead.assignedToId} />
                ) : (
                  <span className="font-medium">{lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : "Unassigned"}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-4" /> Department
                </span>
                {canAssign ? (
                  <AssignLeadDepartmentSelect leadId={lead.id} departments={assignableDepartments} currentDepartmentId={lead.departmentId} />
                ) : (
                  <span className="font-medium">{lead.department?.name ?? "—"}</span>
                )}
              </div>
              <InfoRow icon={Briefcase} label="Source detail" value={lead.sourceDetail ?? "—"} />
              <InfoRow icon={Calendar} label="Captured" value={formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interested in</CardTitle>
              <CardDescription>Property/unit this lead is interested in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lead.interestedProperty ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="size-4" /> Property
                  </span>
                  <Link href={`/properties/${lead.interestedProperty.id}`} className="font-medium text-primary hover:underline">
                    {lead.interestedProperty.name}
                  </Link>
                </div>
              ) : (
                <InfoRow icon={Building2} label="Property" value="Not specified" />
              )}
              {lead.interestedUnit ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="size-4" /> Unit
                  </span>
                  <Link href={`/units/${lead.interestedUnit.id}`} className="font-medium text-primary hover:underline">
                    {lead.interestedUnit.property.name} — Unit {lead.interestedUnit.unitNumber}
                  </Link>
                </div>
              ) : (
                <InfoRow icon={Building2} label="Unit" value="Not specified" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
              <CardDescription>What this lead is looking for.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{lead.requirements || "No requirements captured yet."}</p>
            </CardContent>
          </Card>

          {aiSuggestion && <AiSuggestionCard suggestion={aiSuggestion} />}
        </TabsContent>

        {/* Pipeline */}
        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline history</CardTitle>
              <CardDescription>Every stage transition for this lead.</CardDescription>
            </CardHeader>
            <CardContent>
              {lead.statusHistory.length === 0 ? (
                <EmptyState icon={ActivityIcon} title="No history yet" className="border-none py-8" />
              ) : (
                <ol className="space-y-4 border-l border-border pl-4">
                  {lead.statusHistory.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.fromStatus && <StatusBadge status={entry.fromStatus} />}
                        {entry.fromStatus && <span className="text-muted-foreground">&rarr;</span>}
                        <StatusBadge status={entry.toStatus} />
                      </div>
                      {entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.changedBy ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}` : "System"} &middot;{" "}
                        {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ol>
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
                <CardDescription>Calls, emails, SMS, WhatsApp, meetings and notes with this lead.</CardDescription>
              </div>
              {canLogCommunication && (
                <LogCommunicationForm
                  action={logLeadCommunicationAction.bind(null, lead.id)}
                  description="Record a call, email, meeting or other touchpoint with this lead."
                />
              )}
            </CardHeader>
            <CardContent>
              {lead.communications.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No communications logged yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-4">
                  {lead.communications.map((comm) => (
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

        {/* Opportunities */}
        <TabsContent value="opportunities">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Opportunities</CardTitle>
                <CardDescription>Deal value and probability tracked against this lead.</CardDescription>
              </div>
              {canManageOpportunities && <CreateOpportunityDialog leadId={lead.id} />}
            </CardHeader>
            <CardContent>
              {lead.opportunities.length === 0 ? (
                <EmptyState icon={Briefcase} title="No opportunities yet" className="border-none py-8" />
              ) : (
                <div className="space-y-3">
                  {lead.opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} leadId={lead.id} opportunity={{ ...opp, value: Number(opp.value) }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Applications, agreements and correspondence for this lead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload && <UploadDocumentForm action={uploadLeadDocumentAction.bind(null, lead.id)} />}
              {lead.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {lead.documents.map((doc) => (
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
                          <DeleteDocumentButton fileName={doc.fileName} deleteAction={deleteLeadDocumentAction.bind(null, doc.id, lead.id)} />
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
            tasks={lead.tasks}
            canCreate={canCreateTask}
            staff={staff}
            departments={departments}
            createAction={createLeadTaskAction.bind(null, lead.id)}
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
