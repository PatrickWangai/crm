import { z } from "zod";

export const INTEGRATION_STATUSES = ["MOCK", "CONNECTED", "DISCONNECTED", "ERROR"] as const;

export const integrationConfigSchema = z.object({
  status: z.enum(INTEGRATION_STATUSES),
  endpoint: z.string().trim().max(200).optional().or(z.literal("")),
});

export type IntegrationConfigInput = z.infer<typeof integrationConfigSchema>;

export interface IntegrationFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
