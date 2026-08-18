import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { listWorkflows } from "@/lib/services/workflow.service";
import { listBusinessUnitOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WorkflowFormSheet } from "@/components/admin/workflows/workflow-form-sheet";
import { DeleteWorkflowButton } from "@/components/admin/workflows/delete-workflow-button";
import { WORKFLOW_TRIGGER_TYPES } from "@/lib/validation/workflow";
import { Workflow as WorkflowIcon } from "lucide-react";

export default async function WorkflowsPage() {
  await requireAnyPermissionOrRedirect(["settings.manage"]);
  const [workflows, businessUnits] = await Promise.all([listWorkflows(), listBusinessUnitOptions()]);

  const triggerLabel = (value: string) => WORKFLOW_TRIGGER_TYPES.find((t) => t.value === value)?.label ?? value;

  return (
    <div>
      <PageHeader
        title="Workflow Automations"
        description={'Toggles the "Check ..." triggers on Tasks, Tickets, Leads and Leases — since this environment has no scheduler, each is run manually from its module page.'}
        actions={<WorkflowFormSheet mode="create" businessUnits={businessUnits} />}
      />

      <div className="rounded-lg border border-border bg-card p-4">
        {workflows.length === 0 ? (
          <EmptyState
            icon={WorkflowIcon}
            title="No automations configured"
            description="Every trigger runs enabled-by-default until you add a rule here to turn it off."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Business unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{wf.name}</p>
                    {wf.description && <p className="text-xs text-muted-foreground">{wf.description}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{triggerLabel(wf.triggerType)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{wf.businessUnit?.name ?? "All"}</TableCell>
                  <TableCell>
                    <Badge variant={wf.isActive ? "success" : "outline"}>{wf.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <WorkflowFormSheet
                        mode="edit"
                        workflowId={wf.id}
                        businessUnits={businessUnits}
                        defaultValues={{
                          name: wf.name,
                          description: wf.description,
                          triggerType: wf.triggerType,
                          businessUnitId: wf.businessUnitId,
                          isActive: wf.isActive,
                        }}
                      />
                      <DeleteWorkflowButton workflowId={wf.id} name={wf.name} />
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
