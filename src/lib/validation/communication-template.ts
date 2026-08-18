import { z } from "zod";

export const TEMPLATE_CHANNELS = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
] as const;

export const communicationTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  body: z.string().trim().min(1, "Body is required").max(4000),
  isActive: z.enum(["true", "false"]).default("true"),
});

export type CommunicationTemplateInput = z.infer<typeof communicationTemplateSchema>;

export interface CommunicationTemplateFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
