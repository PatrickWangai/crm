import { z } from "zod";

export const communicationSchema = z.object({
  channel: z.enum(["CALL", "EMAIL", "SMS", "WHATSAPP", "MEETING", "NOTE", "WALK_IN"]),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  content: z.string().trim().min(1, "Details are required").max(2000),
  occurredAt: z.string().optional().or(z.literal("")),
});

export type CommunicationInput = z.infer<typeof communicationSchema>;

export interface CommunicationFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export interface DocumentFormState {
  error?: string;
  success?: boolean;
}

export const sendCustomerEmailSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(150),
  body: z.string().trim().min(1, "Message is required").max(5000),
});

export type SendCustomerEmailInput = z.infer<typeof sendCustomerEmailSchema>;

export interface SendCustomerEmailFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
