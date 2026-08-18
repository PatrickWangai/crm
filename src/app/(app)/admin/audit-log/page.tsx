import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { listAuditEntityTypes, listAuditLog } from "@/lib/services/audit.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { AuditFilters } from "@/components/admin/audit/audit-filters";
import { ClipboardList } from "lucide-react";

function actionVariant(action: string): "success" | "warning" | "destructive" | "info" | "secondary" {
  if (action.includes("deleted") || action.includes("revoked") || action.includes("suspended")) return "destructive";
  if (action.includes("created") || action.includes("granted")) return "success";
  if (action.includes("login")) return "info";
  if (action.includes("updated") || action.includes("changed")) return "warning";
  return "secondary";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermissionOrRedirect("audit_logs.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const entityType = typeof sp.entityType === "string" ? sp.entityType : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const [{ data: entries, total, pageCount }, entityTypes] = await Promise.all([
    listAuditLog({ q, entityType, page }),
    listAuditEntityTypes(),
  ]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="A complete, tamper-evident trail of actions across the CRM."
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Log" }]}
      />

      <Card className="space-y-4 p-4">
        <AuditFilters entityTypes={entityTypes} />

        {entries.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No activity recorded yet" description="Actions taken across the CRM will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>IP address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : <span className="text-muted-foreground">System</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.entityType}
                    {entry.entityId && <span className="ml-1 font-mono text-xs">#{entry.entityId.slice(-6)}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.ipAddress ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} pageCount={pageCount} total={total} />
      </Card>
    </div>
  );
}
