import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { getStakeholderActivity, getStakeholderProfile } from "@/lib/services/stakeholder.service";
import { listBusinessUnitOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StakeholderFormSheet } from "@/components/stakeholders/stakeholder-form-sheet";
import { DeleteStakeholderButton } from "@/components/stakeholders/delete-stakeholder-button";
import { NotesEditor } from "@/components/stakeholders/profile/notes-editor";
import { LogCommunicationForm } from "@/components/communications/log-communication-form";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { logCommunicationAction, uploadDocumentAction, deleteDocumentAction } from "@/app/(app)/stakeholders/actions";
import { initials, formatCurrency } from "@/lib/utils";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  UserCog,
  IdCard,
  FileText,
  MessageSquare,
  Ticket as TicketIcon,
  CheckSquare,
  Home,
  Activity as ActivityIcon,
  Download,
  Calendar,
} from "lucide-react";

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

export default async function StakeholderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["stakeholders.view_all", "stakeholders.view_own"]);
  const { id } = await params;

  let profile: Awaited<ReturnType<typeof getStakeholderProfile>>;
  let activity: Awaited<ReturnType<typeof getStakeholderActivity>>;
  let businessUnits: Awaited<ReturnType<typeof listBusinessUnitOptions>>;
  let staff: Awaited<ReturnType<typeof listUserOptions>>;
  try {
    [profile, activity, businessUnits, staff] = await Promise.all([
      getStakeholderProfile(id),
      getStakeholderActivity(id),
      listBusinessUnitOptions(),
      listUserOptions(),
    ]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/forbidden");
    throw err;
  }
  if (!profile) notFound();

  const canUpdate = hasPermission(user, "stakeholders.update");
  const canDelete = hasPermission(user, "stakeholders.delete");
  const canLogCommunication = hasPermission(user, "communications.create");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={`${profile.firstName} ${profile.lastName}`}
        breadcrumbs={[{ label: "Stakeholders", href: "/stakeholders" }, { label: `${profile.firstName} ${profile.lastName}` }]}
        actions={
          canDelete ? <DeleteStakeholderButton stakeholderId={profile.id} name={`${profile.firstName} ${profile.lastName}`} /> : undefined
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials(profile.firstName, profile.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <StatusBadge status={profile.type} />
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.code} {profile.organization && `· ${profile.organization}`}
              </p>
            </div>
          </div>
          {canUpdate && (
            <StakeholderFormSheet
              mode="edit"
              stakeholderId={profile.id}
              businessUnits={businessUnits}
              staff={staff}
              defaultValues={{
                type: profile.type,
                firstName: profile.firstName,
                lastName: profile.lastName,
                organization: profile.organization,
                email: profile.email,
                phone: profile.phone,
                alternatePhone: profile.alternatePhone,
                address: profile.address,
                city: profile.city,
                idNumber: profile.idNumber,
                kraPin: profile.kraPin,
                businessUnitId: profile.businessUnitId,
                assignedStaffId: profile.assignedStaffId,
              }}
            />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Mail} label="Email" value={profile.email ?? "—"} />
              <InfoRow icon={Phone} label="Phone" value={profile.phone ?? "—"} />
              <InfoRow icon={Phone} label="Alternate phone" value={profile.alternatePhone ?? "—"} />
              <InfoRow icon={MapPin} label="Address" value={[profile.address, profile.city].filter(Boolean).join(", ") || "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={IdCard} label="ID number" value={profile.idNumber ?? "—"} />
              <InfoRow icon={IdCard} label="KRA PIN" value={profile.kraPin ?? "—"} />
              <InfoRow icon={Building2} label="Business unit" value={profile.businessUnit?.name ?? "—"} />
              <InfoRow
                icon={UserCog}
                label="Assigned staff"
                value={profile.assignedStaff ? `${profile.assignedStaff.firstName} ${profile.assignedStaff.lastName}` : "Unassigned"}
              />
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Snapshot</CardTitle>
              <CardDescription>Records linked to this profile across the CRM.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SnapshotStat icon={TicketIcon} label="Tickets" value={profile.tickets.length} />
              <SnapshotStat icon={CheckSquare} label="Tasks" value={profile.tasks.length} />
              <SnapshotStat icon={FileText} label="Documents" value={profile.documents.length} />
              <SnapshotStat icon={MessageSquare} label="Interactions" value={profile.communications.length} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
              <CardDescription>A chronological record of everything that has happened on this profile.</CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <EmptyState icon={ActivityIcon} title="No activity yet" className="border-none py-8" />
              ) : (
                <ol className="space-y-4 border-l border-border pl-4">
                  {activity.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-primary" />
                      <p className="text-sm">
                        <span className="font-medium">{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "System"}</span>{" "}
                        <span className="text-muted-foreground">{entry.action.replace(/[._]/g, " ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</p>
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
                <CardDescription>Calls, emails, SMS, WhatsApp, meetings and notes with this stakeholder.</CardDescription>
              </div>
              {canLogCommunication && (
                <LogCommunicationForm
                  action={logCommunicationAction.bind(null, profile.id)}
                  description="Record a call, email, meeting or other touchpoint with this stakeholder."
                />
              )}
            </CardHeader>
            <CardContent>
              {profile.communications.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No communications logged yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-4">
                  {profile.communications.map((comm) => (
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

        {/* Tickets */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
              <CardDescription>Customer service requests raised by this stakeholder.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={TicketIcon}
                title="No tickets yet"
                description="Ticket management ships with the Customer Service module."
                className="border-none py-8"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>KYC documents, agreements and correspondence for this stakeholder.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload && <UploadDocumentForm action={uploadDocumentAction.bind(null, profile.id)} />}
              {profile.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {profile.documents.map((doc) => (
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
                          <DeleteDocumentButton fileName={doc.fileName} deleteAction={deleteDocumentAction.bind(null, doc.id, profile.id)} />
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
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Follow-ups and action items related to this stakeholder.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={CheckSquare}
                title="No tasks yet"
                description="Task management ships in a later phase."
                className="border-none py-8"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Properties */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
              <CardDescription>Units occupied, owned or leased by this stakeholder.</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.leasesAsTenant.length === 0 && profile.propertiesOwned.length === 0 && profile.unitsOccupied.length === 0 ? (
                <EmptyState
                  icon={Home}
                  title="No property records yet"
                  description="Property management ships in a later phase."
                  className="border-none py-8"
                />
              ) : (
                <div className="space-y-6">
                  {profile.leasesAsTenant.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leases</p>
                      <ul className="space-y-2">
                        {profile.leasesAsTenant.map((lease) => (
                          <li key={lease.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                            <span>
                              {lease.unit.property.name} &middot; Unit {lease.unit.unitNumber}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="size-3.5" />
                              {new Date(lease.startDate).toLocaleDateString()} – {new Date(lease.endDate).toLocaleDateString()}
                            </span>
                            <span className="font-medium">{formatCurrency(Number(lease.rentAmount))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Internal context — visible only to CRM users.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotesEditor stakeholderId={profile.id} initialNotes={profile.notes ?? ""} readOnly={!canUpdate} />
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

function SnapshotStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
