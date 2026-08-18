import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { listCommunicationTemplates } from "@/lib/services/communication-template.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TemplateFormSheet } from "@/components/admin/communication-templates/template-form-sheet";
import { DeleteTemplateButton } from "@/components/admin/communication-templates/delete-template-button";
import { MessageSquare } from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = { EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp" };

export default async function CommunicationTemplatesAdminPage() {
  await requireAnyPermissionOrRedirect(["settings.manage"]);
  const templates = await listCommunicationTemplates();

  return (
    <div>
      <PageHeader
        title="Communication Templates"
        description="Reusable message content staff can reach for when emailing, texting, or messaging leads and stakeholders."
        actions={<TemplateFormSheet mode="create" />}
      />

      <div className="rounded-lg border border-border bg-card p-4">
        {templates.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No templates yet" description="Add a template to give staff reusable message content." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Body preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{template.name}</p>
                    {template.subject && <p className="text-xs text-muted-foreground">{template.subject}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{CHANNEL_LABELS[template.channel] ?? template.channel}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{template.body}</TableCell>
                  <TableCell>
                    <Badge variant={template.isActive ? "success" : "outline"}>{template.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {template.createdBy ? `${template.createdBy.firstName} ${template.createdBy.lastName}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <TemplateFormSheet
                        mode="edit"
                        templateId={template.id}
                        defaultValues={{
                          name: template.name,
                          channel: template.channel,
                          subject: template.subject,
                          body: template.body,
                          isActive: template.isActive,
                        }}
                      />
                      <DeleteTemplateButton templateId={template.id} name={template.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
