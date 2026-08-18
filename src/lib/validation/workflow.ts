import { z } from "zod";

/**
 * Trigger types recognized by the automation checks that exist in this build
 * (task.service.flagOverdueTasks, ticket.service.checkSlaRisk,
 * lead.service.flagFollowUpsDue, lease.service.flagExpiringLeases). A
 * Workflow row with one of these triggerTypes gates whether that check
 * actually flags records and sends notifications when it runs.
 */
export const WORKFLOW_TRIGGER_TYPES = [
  { value: "task.overdue_check", label: "Task overdue reminder" },
  { value: "ticket.sla_risk_check", label: "Ticket SLA risk alert" },
  { value: "lead.follow_up_check", label: "Lead follow-up reminder" },
  { value: "lease.renewal_check", label: "Lease renewal reminder" },
] as const;

export const workflowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  triggerType: z.string().trim().min(1, "Select a trigger"),
  businessUnitId: z.string().optional().or(z.literal("")),
  isActive: z.enum(["true", "false"]).default("true"),
});

export type WorkflowInput = z.infer<typeof workflowSchema>;

export interface WorkflowFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
