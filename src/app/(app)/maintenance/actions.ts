"use server";

import { revalidatePath } from "next/cache";
import type { JobCardStatus } from "@prisma/client";
import { maintenanceSchema, maintenanceStatusChangeSchema, type MaintenanceFormState } from "@/lib/validation/maintenance";
import { assignMaintenanceRequest, createMaintenanceRequest, deleteMaintenanceRequest, updateMaintenanceStatus } from "@/lib/services/maintenance.service";
import { deleteDocument, uploadDocument } from "@/lib/services/document.service";
import type { DocumentFormState } from "@/lib/validation/communication";

function toInput(formData: FormData) {
  return {
    propertyId: formData.get("propertyId"),
    unitId: formData.get("unitId"),
    issueDescription: formData.get("issueDescription"),
    priority: formData.get("priority"),
    assignedToId: formData.get("assignedToId"),
    expectedCompletionDate: formData.get("expectedCompletionDate"),
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createMaintenanceAction(_prev: MaintenanceFormState, formData: FormData): Promise<MaintenanceFormState> {
  const parsed = maintenanceSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const request = await createMaintenanceRequest(parsed.data);
    revalidatePath("/maintenance");
    return { success: true, requestId: request.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateMaintenanceStatusAction(id: string, status: JobCardStatus, cost?: number): Promise<{ error?: string }> {
  const parsed = maintenanceStatusChangeSchema.safeParse({ status, cost });
  if (!parsed.success) return { error: "Invalid status." };
  try {
    await updateMaintenanceStatus(id, parsed.data.status, parsed.data.cost === "" || parsed.data.cost === undefined ? undefined : parsed.data.cost);
    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function assignMaintenanceAction(id: string, assignedToId: string | null): Promise<{ error?: string }> {
  try {
    await assignMaintenanceRequest(id, assignedToId);
    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteMaintenanceAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteMaintenanceRequest(id);
    revalidatePath("/maintenance");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function uploadMaintenanceDocumentAction(requestId: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Please choose a file to upload." };
  const accessLevelRaw = formData.get("accessLevel");
  const accessLevel = accessLevelRaw === "restricted" || accessLevelRaw === "public" ? accessLevelRaw : "internal";
  try {
    await uploadDocument({ maintenanceRequestId: requestId }, file, accessLevel);
    revalidatePath(`/maintenance/${requestId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteMaintenanceDocumentAction(documentId: string, requestId: string): Promise<{ error?: string }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/maintenance/${requestId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
