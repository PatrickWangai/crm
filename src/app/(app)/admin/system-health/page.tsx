import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { getSystemHealth } from "@/lib/services/health.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Database, Server, Activity, CheckCircle2, XCircle } from "lucide-react";

const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive" | "warning"> = {
  MOCK: "outline",
  CONNECTED: "success",
  DISCONNECTED: "warning",
  ERROR: "destructive",
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default async function SystemHealthPage() {
  await requireAnyPermissionOrRedirect(["settings.manage"]);
  const health = await getSystemHealth();

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" description="Live status of the database, integrations, and server runtime. Read-only snapshot, refresh the page for the latest values." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" /> Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {health.database.connected ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              <span className="font-medium">{health.database.connected ? "Connected" : "Connection failed"}</span>
              {health.database.error && <span className="text-xs text-destructive">{health.database.error}</span>}
            </div>
            {health.database.latencyMs !== null && <span className="text-muted-foreground">{health.database.latencyMs}ms</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" /> Record counts
          </CardTitle>
          <CardDescription>Total rows currently stored per entity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {health.recordCounts.map((row) => (
              <div key={row.label} className="rounded-md border border-border p-3 text-center">
                <p className="text-2xl font-semibold">{row.count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{row.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connection status of external system integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {health.integrations.map((integration) => (
            <div key={integration.displayName} className="flex items-center justify-between text-sm">
              <span className="font-medium">{integration.displayName}</span>
              <div className="flex items-center gap-3">
                {integration.lastSyncedAt && (
                  <span className="text-xs text-muted-foreground">
                    Last synced {formatDistanceToNow(new Date(integration.lastSyncedAt), { addSuffix: true })}
                  </span>
                )}
                <Badge variant={STATUS_VARIANT[integration.status] ?? "outline"}>{integration.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-4" /> Server runtime
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Node version</p>
            <p className="font-medium">{health.runtime.nodeVersion}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Environment</p>
            <p className="font-medium">{health.runtime.environment}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Process uptime</p>
            <p className="font-medium">{formatUptime(health.runtime.uptimeSeconds)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Server time</p>
            <p className="font-medium">{new Date(health.runtime.serverTime).toLocaleString("en-KE")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
