import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listProperties } from "@/lib/services/property.service";
import { listBusinessUnitOptions, listStakeholderOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertyFormSheet } from "@/components/properties/property-form-sheet";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { importPropertiesAction, importUnitsAction } from "@/app/(app)/properties/actions";
import { Building2 } from "lucide-react";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["properties.view_all"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const propertyType = typeof sp.propertyType === "string" ? sp.propertyType : undefined;
  const businessUnitId = typeof sp.businessUnitId === "string" ? sp.businessUnitId : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const [{ data: properties, total, pageCount }, businessUnits, landlords] = await Promise.all([
    listProperties({ q, propertyType, businessUnitId, page }),
    listBusinessUnitOptions(),
    listStakeholderOptions(),
  ]);
  const canManage = hasPermission(user, "properties.manage");

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Buildings and estates managed across the portfolio."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <CsvImportDialog
                title="Bulk import properties"
                description="Create multiple properties at once. Import properties before importing their units."
                templateHeaders={["name", "propertyType", "address", "city", "region", "businessUnitCode", "landlordCode", "ezenPropertyRef"]}
                templateExample={[["Kilimani Heights", "Apartment", "123 Argwings Kodhek Rd", "Nairobi", "Nairobi", "MRE", "", ""]]}
                action={importPropertiesAction}
              />
              <CsvImportDialog
                title="Bulk import units"
                description="Create multiple units at once, referencing an existing property by its code (e.g. PRP-0001)."
                templateHeaders={["propertyCode", "unitNumber", "unitType", "floor", "bedrooms", "bathrooms", "sizeSqm", "rentAmount", "status"]}
                templateExample={[["PRP-0001", "A1", "2BR", "1", "2", "2", "85", "85000", "VACANT"]]}
                action={importUnitsAction}
              />
              <PropertyFormSheet mode="create" businessUnits={businessUnits} landlords={landlords} redirectOnCreate />
            </div>
          ) : undefined
        }
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <PropertyFilters businessUnits={businessUnits} />

        {properties.length === 0 ? (
          <EmptyState icon={Building2} title="No properties found" description="Try adjusting your filters, or add a new property." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Open job cards</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <Link href={`/properties/${property.id}`} className="hover:text-primary">
                        <p className="text-sm font-medium">{property.name}</p>
                        <p className="text-xs text-muted-foreground">{property.code}</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{property.propertyType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{[property.city, property.region].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {property.landlord ? `${property.landlord.firstName} ${property.landlord.lastName}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{property._count.units}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{property._count.maintenanceRequests}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
