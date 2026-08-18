"use server";

import { revalidatePath } from "next/cache";
import { slaSchema, type SlaFormState } from "@/lib/validation/sla";
import { createSLA, deleteSLA, updateSLA } from "@/lib/services/sla.service";

function toInput(formData: FormData) {
  return {
    name: formData.get("name"),
    businessUnitId: formData.get("businessUnitId"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    responseTimeMinutes: formData.get("responseTimeMinutes"),
    resolutionTimeMinutes: formData.get("resolutionTimeMinutes"),
    isActive: formData.get("isActive") ?? "true",
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createSLAAction(_prev: SlaFormState, formData: FormData): Promise<SlaFormState> {
  const parsed = slaSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createSLA(parsed.data);
    revalidatePath("/admin/sla");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateSLAAction(id: string, _prev: SlaFormState, formData: FormData): Promise<SlaFormState> {
  const parsed = slaSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateSLA(id, parsed.data);
    revalidatePath("/admin/sla");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteSLAAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteSLA(id);
    revalidatePath("/admin/sla");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
