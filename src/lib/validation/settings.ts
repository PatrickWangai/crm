import { z } from "zod";

export const settingUpdateSchema = z.object({
  value: z.string().trim().min(1, "Value is required").max(300),
});

export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;

export interface SettingFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
