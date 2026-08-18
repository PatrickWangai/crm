"use server";

import { revalidatePath } from "next/cache";
import { settingUpdateSchema, type SettingFormState } from "@/lib/validation/settings";
import { updateSetting } from "@/lib/services/settings.service";

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function updateSettingAction(key: string, _prev: SettingFormState, formData: FormData): Promise<SettingFormState> {
  const parsed = settingUpdateSchema.safeParse({ value: formData.get("value") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateSetting(key, parsed.data);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
