"use server";

import { revalidatePath } from "next/cache";
import { stakeholderSchema } from "@/lib/validation/stakeholder";
import { communicationSchema, type CommunicationFormState, type DocumentFormState } from "@/lib/validation/communication";
import { taskSchema, type TaskFormState } from "@/lib/validation/task";
import {
  createStakeholder,
  deleteStakeholder,
  updateStakeholder,
  updateStakeholderNotes,
} from "@/lib/services/stakeholder.service";
import { logCommunication } from "@/lib/services/communication.service";
import { deleteDocument, uploadDocument } from "@/lib/services/document.service";
import { createTask } from "@/lib/services/task.service";

export interface StakeholderFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  stakeholderId?: string;
}

function toInput(formData: FormData) {
  return {
    type: formData.get("type"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    organization: formData.get("organization"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    alternatePhone: formData.get("alternatePhone"),
    address: formData.get("address"),
    city: formData.get("city"),
    idNumber: formData.get("idNumber"),
    kraPin: formData.get("kraPin"),
    businessUnitId: formData.get("businessUnitId"),
    assignedStaffId: formData.get("assignedStaffId"),
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createStakeholderAction(_prev: StakeholderFormState, formData: FormData): Promise<StakeholderFormState> {
  const parsed = stakeholderSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const record = await createStakeholder(parsed.data);
    revalidatePath("/stakeholders");
    return { success: true, stakeholderId: record.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateStakeholderAction(id: string, _prev: StakeholderFormState, formData: FormData): Promise<StakeholderFormState> {
  const parsed = stakeholderSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateStakeholder(id, parsed.data);
    revalidatePath("/stakeholders");
    revalidatePath(`/stakeholders/${id}`);
    return { success: true, stakeholderId: id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteStakeholderAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteStakeholder(id);
    revalidatePath("/stakeholders");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateNotesAction(id: string, notes: string) {
  await updateStakeholderNotes(id, notes);
  revalidatePath(`/stakeholders/${id}`);
}

export async function logCommunicationAction(
  stakeholderId: string,
  _prev: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const parsed = communicationSchema.safeParse({
    channel: formData.get("channel"),
    direction: formData.get("direction"),
    subject: formData.get("subject"),
    content: formData.get("content"),
    occurredAt: formData.get("occurredAt"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await logCommunication({ stakeholderId }, parsed.data);
    revalidatePath(`/stakeholders/${stakeholderId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function uploadDocumentAction(stakeholderId: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  try {
    await uploadDocument({ stakeholderId }, file);
    revalidatePath(`/stakeholders/${stakeholderId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteDocumentAction(documentId: string, stakeholderId: string): Promise<{ error?: string }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/stakeholders/${stakeholderId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function createStakeholderTaskAction(stakeholderId: string, _prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate"),
    assigneeId: formData.get("assigneeId"),
    departmentId: formData.get("departmentId"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const task = await createTask({ stakeholderId }, parsed.data);
    revalidatePath(`/stakeholders/${stakeholderId}`);
    return { success: true, taskId: task.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
