"use server";

import { revalidatePath } from "next/cache";
import { businessUnitSchema, businessUnitUpdateSchema } from "@/lib/validation/org";
import { createBusinessUnit, deleteBusinessUnit, updateBusinessUnit } from "@/lib/services/org.service";

export interface BusinessUnitFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export async function createBusinessUnitAction(_prev: BusinessUnitFormState, formData: FormData): Promise<BusinessUnitFormState> {
  const parsed = businessUnitSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createBusinessUnit(parsed.data);
    revalidatePath("/admin/business-units");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create business unit." };
  }
}

export async function updateBusinessUnitAction(id: string, _prev: BusinessUnitFormState, formData: FormData): Promise<BusinessUnitFormState> {
  const parsed = businessUnitUpdateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateBusinessUnit(id, parsed.data);
    revalidatePath("/admin/business-units");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update business unit." };
  }
}

export async function deleteBusinessUnitAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteBusinessUnit(id);
    revalidatePath("/admin/business-units");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete business unit." };
  }
}
