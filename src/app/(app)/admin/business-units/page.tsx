import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { listBusinessUnits } from "@/lib/services/org.service";
import { PageHeader } from "@/components/layout/page-header";
import { BusinessUnitCard } from "@/components/admin/business-units/business-unit-card";

export default async function BusinessUnitsPage() {
  await requirePermissionOrRedirect("departments.manage");
  const businessUnits = await listBusinessUnits();

  return (
    <div>
      <PageHeader
        title="Business Units"
        description="The core legal entities of Masterways Group of Companies, per the CRM Blueprint."
        breadcrumbs={[{ label: "Administration" }, { label: "Business Units" }]}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {businessUnits.map((bu) => (
          <BusinessUnitCard
            key={bu.id}
            id={bu.id}
            code={bu.code}
            name={bu.name}
            description={bu.description}
            userCount={bu._count.users}
            departmentCount={bu._count.departments}
          />
        ))}
      </div>
    </div>
  );
}
