"use server";

import { revalidatePath } from "next/cache";
import { communicationTemplateSchema, type CommunicationTemplateFormState } from "@/lib/validation/communication-template";
import { createCommunicationTemplate, updateCommunicationTemplate, deleteCommunicationTemplate } from "@/lib/services/communication-template.service";

function toInput(formData: FormData) {
  return {
    name: formData.get("name"),
    channel: formData.get("channel"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    isActive: formData.get("isActive") ?? "true",
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createCommunicationTemplateAction(_prev: CommunicationTemplateFormState, formData: FormData): Promise<CommunicationTemplateFormState> {
  const parsed = communicationTemplateSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createCommunicationTemplate(parsed.data);
    revalidatePath("/admin/communication-templates");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateCommunicationTemplateAction(
  id: string,
  _prev: CommunicationTemplateFormState,
  formData: FormData,
): Promise<CommunicationTemplateFormState> {
  const parsed = communicationTemplateSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateCommunicationTemplate(id, parsed.data);
    revalidatePath("/admin/communication-templates");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteCommunicationTemplateAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteCommunicationTemplate(id);
    revalidatePath("/admin/communication-templates");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
