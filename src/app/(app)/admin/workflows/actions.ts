"use server";

import { revalidatePath } from "next/cache";
import { workflowSchema, type WorkflowFormState } from "@/lib/validation/workflow";
import { createWorkflow, deleteWorkflow, updateWorkflow } from "@/lib/services/workflow.service";

function toInput(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    triggerType: formData.get("triggerType"),
    businessUnitId: formData.get("businessUnitId"),
    isActive: formData.get("isActive") ?? "true",
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createWorkflowAction(_prev: WorkflowFormState, formData: FormData): Promise<WorkflowFormState> {
  const parsed = workflowSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createWorkflow(parsed.data);
    revalidatePath("/admin/workflows");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateWorkflowAction(id: string, _prev: WorkflowFormState, formData: FormData): Promise<WorkflowFormState> {
  const parsed = workflowSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateWorkflow(id, parsed.data);
    revalidatePath("/admin/workflows");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteWorkflowAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteWorkflow(id);
    revalidatePath("/admin/workflows");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
