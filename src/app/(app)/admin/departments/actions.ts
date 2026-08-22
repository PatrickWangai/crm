"use server";

import { revalidatePath } from "next/cache";
import { departmentSchema } from "@/lib/validation/org";
import { createDepartment, deleteDepartment, updateDepartment } from "@/lib/services/org.service";

export interface DepartmentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

function toInput(formData: FormData) {
  return {
    name: formData.get("name"),
    code: formData.get("code"),
    businessUnitId: formData.get("businessUnitId"),
    category: formData.get("category"),
  };
}

export async function createDepartmentAction(_prev: DepartmentFormState, formData: FormData): Promise<DepartmentFormState> {
  const parsed = departmentSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createDepartment(parsed.data);
    revalidatePath("/admin/departments");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create department." };
  }
}

export async function updateDepartmentAction(id: string, _prev: DepartmentFormState, formData: FormData): Promise<DepartmentFormState> {
  const parsed = departmentSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateDepartment(id, parsed.data);
    revalidatePath("/admin/departments");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update department." };
  }
}

export async function deleteDepartmentAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteDepartment(id);
    revalidatePath("/admin/departments");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete department." };
  }
}
