import { z } from "zod";

export const slaSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  businessUnitId: z.string().optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  responseTimeMinutes: z.coerce.number().int().min(1, "Must be at least 1 minute").max(100_000),
  resolutionTimeMinutes: z.coerce.number().int().min(1, "Must be at least 1 minute").max(100_000),
  isActive: z.enum(["true", "false"]).default("true"),
});

export type SlaInput = z.infer<typeof slaSchema>;

export interface SlaFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
