import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { listSettings, DEFAULT_SETTINGS } from "@/lib/services/settings.service";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingEditSheet } from "@/components/admin/settings/setting-edit-sheet";

export default async function SettingsAdminPage() {
  await requireAnyPermissionOrRedirect(["settings.manage"]);
  const saved = await listSettings();
  const savedByKey = new Map(saved.map((s) => [s.key, s]));

  const rows = DEFAULT_SETTINGS.map((def) => {
    const savedRow = savedByKey.get(def.key);
    return {
      key: def.key,
      description: def.description,
      value: savedRow?.value ?? def.value,
      updatedBy: savedRow?.updatedBy ? `${savedRow.updatedBy.firstName} ${savedRow.updatedBy.lastName}` : "—",
      updatedAt: savedRow ? new Date(savedRow.updatedAt).toLocaleString("en-KE") : "Default (never changed)",
    };
  });

  return (
    <div>
      <PageHeader title="System Settings" description="Organization-wide values used across the CRM, such as company name and default currency." />

      <div className="rounded-lg border border-border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Last updated by</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <p className="text-sm font-medium">{row.key}</p>
                  {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
                </TableCell>
                <TableCell className="text-sm font-medium">{row.value}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.updatedBy}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.updatedAt}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <SettingEditSheet settingKey={row.key} label={row.key} description={row.description} value={row.value} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
