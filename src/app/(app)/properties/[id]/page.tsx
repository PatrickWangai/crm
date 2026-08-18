import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { getPropertyDetail } from "@/lib/services/property.service";
import { listBusinessUnitOptions, listStakeholderOptions } from "@/lib/services/lookups.service";
import { uploadPropertyDocumentAction, deletePropertyDocumentAction } from "@/app/(app)/properties/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyFormSheet } from "@/components/properties/property-form-sheet";
import { DeletePropertyButton } from "@/components/properties/delete-property-button";
import { UnitFormSheet } from "@/components/properties/unit-form-sheet";
import { DeleteUnitButton } from "@/components/properties/delete-unit-button";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { formatCurrency } from "@/lib/utils";
import { Building2, MapPin, User as UserIcon, Home, Wrench, FileText, Download } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["properties.view_all"]);
  const { id } = await params;

  const [property, businessUnits, landlords] = await Promise.all([getPropertyDetail(id), listBusinessUnitOptions(), listStakeholderOptions()]);
  if (!property) notFound();

  const canManage = hasPermission(user, "properties.manage");
  const canManageUnits = hasPermission(user, "units.manage");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={property.name}
        breadcrumbs={[{ label: "Properties", href: "/properties" }, { label: property.name }]}
        actions={canManage ? <DeletePropertyButton propertyId={property.id} name={property.name} /> : undefined}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{property.name}</h2>
                <Badge variant="outline">{property.propertyType}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {property.code} {property.city && `· ${property.city}`}
              </p>
            </div>
          </div>
          {canManage && (
            <PropertyFormSheet
              mode="edit"
              propertyId={property.id}
              businessUnits={businessUnits}
              landlords={landlords}
              defaultValues={{
                name: property.name,
                propertyType: property.propertyType,
                address: property.address,
                city: property.city,
                region: property.region,
                businessUnitId: property.businessUnitId,
                landlordId: property.landlordId,
              }}
            />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="units">Units ({property.units.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={MapPin} label="Address" value={property.address ?? "—"} />
              <InfoRow icon={MapPin} label="City" value={property.city ?? "—"} />
              <InfoRow icon={MapPin} label="Region" value={property.region ?? "—"} />
              <InfoRow icon={Building2} label="Business unit" value={property.businessUnit?.name ?? "—"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Landlord</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {property.landlord ? (
                <>
                  <InfoRow icon={UserIcon} label="Name" value={`${property.landlord.firstName} ${property.landlord.lastName}`} />
                  <InfoRow icon={UserIcon} label="Phone" value={property.landlord.phone ?? "—"} />
                  <InfoRow icon={UserIcon} label="Email" value={property.landlord.email ?? "—"} />
                </>
              ) : (
                <p className="text-muted-foreground">No landlord on file.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units */}
        <TabsContent value="units">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Units</CardTitle>
                <CardDescription>Individually leasable spaces within this property.</CardDescription>
              </div>
              {canManageUnits && <UnitFormSheet mode="create" propertyId={property.id} />}
            </CardHeader>
            <CardContent>
              {property.units.length === 0 ? (
                <EmptyState icon={Home} title="No units yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {property.units.map((unit) => (
                    <li key={unit.id} className="flex items-center justify-between gap-3 py-3">
                      <Link href={`/units/${unit.id}`} className="min-w-0 flex-1 hover:text-primary">
                        <p className="text-sm font-medium">
                          Unit {unit.unitNumber} <span className="font-normal text-muted-foreground">· {unit.unitType}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(unit.rentAmount))}/mo
                          {unit.currentTenant && ` · ${unit.currentTenant.firstName} ${unit.currentTenant.lastName}`}
                        </p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={unit.status} />
                        {canManageUnits && (
                          <>
                            <UnitFormSheet
                              mode="edit"
                              propertyId={property.id}
                              unitId={unit.id}
                              defaultValues={{
                                unitNumber: unit.unitNumber,
                                unitType: unit.unitType,
                                floor: unit.floor,
                                bedrooms: unit.bedrooms,
                                bathrooms: unit.bathrooms,
                                sizeSqm: unit.sizeSqm ? Number(unit.sizeSqm) : null,
                                rentAmount: Number(unit.rentAmount),
                                status: unit.status,
                              }}
                            />
                            <DeleteUnitButton unitId={unit.id} propertyId={property.id} name={`Unit ${unit.unitNumber}`} />
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance</CardTitle>
              <CardDescription>Job cards raised for this property.</CardDescription>
            </CardHeader>
            <CardContent>
              {property.maintenanceRequests.length === 0 ? (
                <EmptyState icon={Wrench} title="No maintenance requests yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {property.maintenanceRequests.map((req) => (
                    <li key={req.id}>
                      <Link href={`/maintenance/${req.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{req.issueDescription}</p>
                          <p className="text-xs text-muted-foreground">
                            {req.jobCardNumber}
                            {req.unit && ` · Unit ${req.unit.unitNumber}`} &middot; {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={req.priority} />
                          <StatusBadge status={req.status} />
                        </div>
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
              <CardDescription>Title deeds, agreements and correspondence for this property.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload && <UploadDocumentForm action={uploadPropertyDocumentAction.bind(null, property.id)} />}
              {property.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {property.documents.map((doc) => (
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
                          <DeleteDocumentButton fileName={doc.fileName} deleteAction={deletePropertyDocumentAction.bind(null, doc.id, property.id)} />
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
