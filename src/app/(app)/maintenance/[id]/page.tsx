import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { getMaintenanceDetail } from "@/lib/services/maintenance.service";
import { listUserOptions } from "@/lib/services/lookups.service";
import { uploadMaintenanceDocumentAction, deleteMaintenanceDocumentAction } from "@/app/(app)/maintenance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceStatusControl } from "@/components/maintenance/maintenance-status-control";
import { AssignMaintenanceSelect } from "@/components/maintenance/assign-maintenance-select";
import { DeleteMaintenanceButton } from "@/components/maintenance/delete-maintenance-button";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { formatCurrency } from "@/lib/utils";
import { Wrench, Building2, User as UserIcon, Calendar, FileText, Download } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["maintenance.view_all"]);
  const { id } = await params;

  const [request, staff] = await Promise.all([getMaintenanceDetail(id), listUserOptions()]);
  if (!request) notFound();

  const canManage = hasPermission(user, "maintenance.manage");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={request.jobCardNumber}
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: request.jobCardNumber }]}
        actions={canManage ? <DeleteMaintenanceButton requestId={request.id} jobCardNumber={request.jobCardNumber} /> : undefined}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wrench className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{request.jobCardNumber}</h2>
                <StatusBadge status={request.status} />
                <StatusBadge status={request.priority} />
              </div>
              <Link href={`/properties/${request.property.id}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                {request.property.name}
                {request.unit && ` · Unit ${request.unit.unitNumber}`}
              </Link>
            </div>
          </div>
          {canManage && <MaintenanceStatusControl requestId={request.id} currentStatus={request.status} />}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Issue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">{request.issueDescription}</p>
              <InfoRow icon={Building2} label="Property" value={request.property.name} />
              {request.unit && <InfoRow icon={Building2} label="Unit" value={request.unit.unitNumber} />}
              <InfoRow icon={UserIcon} label="Reported by" value={request.reportedBy ? `${request.reportedBy.firstName} ${request.reportedBy.lastName}` : "—"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assignment &amp; timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="size-4" /> Assigned to
                </span>
                {canManage ? (
                  <AssignMaintenanceSelect requestId={request.id} staff={staff} currentAssigneeId={request.assignedToId} />
                ) : (
                  <span className="font-medium">{request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : "Unassigned"}</span>
                )}
              </div>
              <InfoRow icon={Calendar} label="Logged" value={formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })} />
              {request.expectedCompletionDate && (
                <InfoRow icon={Calendar} label="Expected completion" value={new Date(request.expectedCompletionDate).toLocaleDateString()} />
              )}
              {request.completedAt && <InfoRow icon={Calendar} label="Completed" value={new Date(request.completedAt).toLocaleString()} />}
              {request.cost && <InfoRow icon={Calendar} label="Cost incurred" value={formatCurrency(Number(request.cost))} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Photos and reports for this job card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload && <UploadDocumentForm action={uploadMaintenanceDocumentAction.bind(null, request.id)} />}
              {request.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {request.documents.map((doc) => (
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
                          <DeleteDocumentButton fileName={doc.fileName} deleteAction={deleteMaintenanceDocumentAction.bind(null, doc.id, request.id)} />
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
