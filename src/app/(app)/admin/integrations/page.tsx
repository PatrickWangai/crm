import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { listIntegrations } from "@/lib/services/integration.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationConfigSheet } from "@/components/admin/integrations/integration-config-sheet";
import { TestConnectionButton } from "@/components/admin/integrations/test-connection-button";
import { formatDistanceToNow } from "date-fns";
import { Building2, Landmark, MessageSquare, Mail, MessageCircle, Sparkles, type LucideIcon } from "lucide-react";

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  EZEN: Building2,
  SACCO_CBS: Landmark,
  SMS_GATEWAY: MessageSquare,
  EMAIL_GATEWAY: Mail,
  WHATSAPP_GATEWAY: MessageCircle,
  AI_ASSISTANT: Sparkles,
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  EZEN: "Syncs property, unit and lease data with the Ezen property management system.",
  SACCO_CBS: "Syncs SACCO member accounts, savings and loans with the core banking system.",
  SMS_GATEWAY: "Sends SMS notifications and reminders to stakeholders.",
  EMAIL_GATEWAY: "Sends transactional email notifications to stakeholders and staff.",
  WHATSAPP_GATEWAY: "Sends WhatsApp Business messages to stakeholders.",
  AI_ASSISTANT: "Powers AI-suggested next actions surfaced on lead and ticket records.",
};

const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive" | "warning"> = {
  MOCK: "outline",
  CONNECTED: "success",
  DISCONNECTED: "warning",
  ERROR: "destructive",
};

export default async function IntegrationsPage() {
  await requireAnyPermissionOrRedirect(["integrations.manage"]);
  const integrations = await listIntegrations();

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="External systems the CRM can exchange data with. Ships as a mock interface layer until real credentials are configured."
        breadcrumbs={[{ label: "Administration" }, { label: "Integrations" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = PROVIDER_ICONS[integration.provider] ?? Building2;
          const config = integration.config as { endpoint?: string } | null;
          return (
            <Card key={integration.id}>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{integration.displayName}</p>
                      <Badge variant={STATUS_VARIANT[integration.status]} className="mt-1">
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{PROVIDER_DESCRIPTIONS[integration.provider]}</p>
                <p className="text-xs text-muted-foreground">
                  {integration.lastSyncedAt ? `Last checked ${formatDistanceToNow(new Date(integration.lastSyncedAt), { addSuffix: true })}` : "Never checked"}
                  {config?.endpoint && ` · ${config.endpoint}`}
                </p>
                <div className="flex items-center justify-between">
                  <TestConnectionButton integrationId={integration.id} />
                  <IntegrationConfigSheet
                    integrationId={integration.id}
                    displayName={integration.displayName}
                    currentStatus={integration.status}
                    currentEndpoint={config?.endpoint ?? ""}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
