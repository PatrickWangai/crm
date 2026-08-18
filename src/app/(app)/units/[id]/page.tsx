import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { getUnitDetail } from "@/lib/services/unit.service";
import { listStakeholderOptions } from "@/lib/services/lookups.service";
import { uploadUnitDocumentAction, deleteUnitDocumentAction } from "@/app/(app)/units/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaseFormSheet } from "@/components/leases/lease-form-sheet";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { DocumentBadges } from "@/components/documents/document-badges";
import { formatCurrency } from "@/lib/utils";
import { Home, User as UserIcon, FileSignature, FileText, Download } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["units.view_all"]);
  const { id } = await params;

  const [unit, stakeholders] = await Promise.all([getUnitDetail(id), listStakeholderOptions()]);
  if (!unit) notFound();

  const canManageLeases = hasPermission(user, "leases.manage");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={`Unit ${unit.unitNumber}`}
        breadcrumbs={[
          { label: "Properties", href: "/properties" },
          { label: unit.property.name, href: `/properties/${unit.property.id}` },
          { label: `Unit ${unit.unitNumber}` },
        ]}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Home className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Unit {unit.unitNumber}</h2>
                <StatusBadge status={unit.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {unit.property.name} &middot; {unit.unitType} &middot; {formatCurrency(Number(unit.rentAmount))}/mo
              </p>
            </div>
          </div>
          {canManageLeases && unit.status === "VACANT" && (
            <LeaseFormSheet units={[]} tenants={stakeholders} landlords={stakeholders} fixedUnitId={unit.id} />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leases">Leases ({unit.leases.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Unit details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Type" value={unit.unitType} />
              <InfoRow label="Floor" value={unit.floor ?? "—"} />
              <InfoRow label="Bedrooms" value={unit.bedrooms?.toString() ?? "—"} />
              <InfoRow label="Bathrooms" value={unit.bathrooms?.toString() ?? "—"} />
              <InfoRow label="Size" value={unit.sizeSqm ? `${unit.sizeSqm} sqm` : "—"} />
              <InfoRow label="Rent" value={`${formatCurrency(Number(unit.rentAmount))}/mo`} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Current tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {unit.currentTenant ? (
                <InfoRow icon={UserIcon} label="Tenant" value={`${unit.currentTenant.firstName} ${unit.currentTenant.lastName}`} />
              ) : (
                <p className="text-muted-foreground">Vacant — no current tenant.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leases */}
        <TabsContent value="leases">
          <Card>
            <CardHeader>
              <CardTitle>Lease history</CardTitle>
              <CardDescription>All tenancy agreements for this unit.</CardDescription>
            </CardHeader>
            <CardContent>
              {unit.leases.length === 0 ? (
                <EmptyState icon={FileSignature} title="No leases yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {unit.leases.map((lease) => (
                    <li key={lease.id}>
                      <Link href={`/leases/${lease.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                        <div>
                          <p className="text-sm font-medium">{lease.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {lease.tenant.firstName} {lease.tenant.lastName} &middot; {new Date(lease.startDate).toLocaleDateString()} –{" "}
                            {new Date(lease.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={lease.status} />
                      </Link>
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
              <CardDescription>Photos, inspection reports and correspondence for this unit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload && <UploadDocumentForm action={uploadUnitDocumentAction.bind(null, unit.id)} />}
              {unit.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {unit.documents.map((doc) => (
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
                        {canDeleteDocs && <DeleteDocumentButton fileName={doc.fileName} deleteAction={deleteUnitDocumentAction.bind(null, doc.id, unit.id)} />}
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

function InfoRow({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="size-4" />} {label}
      </span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
