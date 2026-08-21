import { z } from "zod";

export const TICKET_CATEGORIES = [
  "Billing Inquiry",
  "Maintenance Request",
  "Sales & Marketing",
  "HR & Administration",
  "Complaint",
  "General Inquiry",
  "Service Request",
  "Technical Support",
  "Account Update",
  "Other",
  "Don't Know",
] as const;

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const TICKET_STATUSES = ["REQUEST_LOGGED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const;

export const ticketSchema = z.object({
  stakeholderId: z.string().trim().min(1, "Select a stakeholder"),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  description: z.string().trim().min(1, "Description is required").max(2000),
  category: z.string().trim().min(1, "Category is required").max(80),
  priority: z.enum(TICKET_PRIORITIES),
  businessUnitId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
});

export type TicketInput = z.infer<typeof ticketSchema>;

export const ticketStatusChangeSchema = z.object({
  status: z.enum(TICKET_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type TicketStatusChangeInput = z.infer<typeof ticketStatusChangeSchema>;

export const ticketCommentSchema = z.object({
  comment: z.string().trim().min(1, "Comment cannot be empty").max(2000),
  isInternal: z.enum(["true", "false"]).default("true"),
});

export type TicketCommentInput = z.infer<typeof ticketCommentSchema>;

export interface TicketFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  ticketId?: string;
}

export interface TicketCommentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
