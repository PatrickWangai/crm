import { z } from "zod";

export const JOB_CARD_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const;

export const maintenanceSchema = z.object({
  propertyId: z.string().trim().min(1, "Select a property"),
  unitId: z.string().optional().or(z.literal("")),
  issueDescription: z.string().trim().min(1, "Describe the issue").max(1000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assignedToId: z.string().optional().or(z.literal("")),
  expectedCompletionDate: z.string().optional().or(z.literal("")),
});

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

export const maintenanceStatusChangeSchema = z.object({
  status: z.enum(JOB_CARD_STATUSES),
  cost: z.coerce.number().min(0).max(999_999_999).optional().or(z.literal("")),
});

export interface MaintenanceFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  requestId?: string;
}
