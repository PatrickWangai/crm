"use server";

import { revalidatePath } from "next/cache";
import type { LeadStatus, OpportunityStage } from "@prisma/client";
import { leadSchema, leadStatusChangeSchema, opportunitySchema } from "@/lib/validation/lead";
import { communicationSchema, type CommunicationFormState, type DocumentFormState } from "@/lib/validation/communication";
import {
  assignLead,
  claimLead,
  createLead,
  deleteLead,
  updateLead,
  updateLeadStatus,
} from "@/lib/services/lead.service";
import { logCommunication } from "@/lib/services/communication.service";
import { deleteDocument, uploadDocument } from "@/lib/services/document.service";
import { createOpportunityForLead, deleteOpportunity, updateOpportunityStage } from "@/lib/services/opportunity.service";

export interface LeadFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  leadId?: string;
}

function toInput(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    source: formData.get("source"),
    sourceDetail: formData.get("sourceDetail"),
    requirements: formData.get("requirements"),
    businessUnitId: formData.get("businessUnitId"),
    assignedToId: formData.get("assignedToId"),
    nextFollowUpAt: formData.get("nextFollowUpAt"),
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const lead = await createLead(parsed.data);
    revalidatePath("/leads");
    return { success: true, leadId: lead.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateLeadAction(id: string, _prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateLead(id, parsed.data);
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { success: true, leadId: id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteLeadAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteLead(id);
    revalidatePath("/leads");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateLeadStatusAction(id: string, status: LeadStatus, note?: string): Promise<{ error?: string }> {
  const parsed = leadStatusChangeSchema.safeParse({ status, note });
  if (!parsed.success) return { error: "Invalid status." };
  try {
    await updateLeadStatus(id, parsed.data.status, parsed.data.note);
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function assignLeadAction(id: string, assignedToId: string | null): Promise<{ error?: string }> {
  try {
    await assignLead(id, assignedToId);
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function claimLeadAction(id: string): Promise<{ error?: string }> {
  try {
    await claimLead(id);
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function logLeadCommunicationAction(
  leadId: string,
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
    await logCommunication({ leadId }, parsed.data);
    revalidatePath(`/leads/${leadId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function uploadLeadDocumentAction(leadId: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  try {
    await uploadDocument({ leadId }, file);
    revalidatePath(`/leads/${leadId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteLeadDocumentAction(documentId: string, leadId: string): Promise<{ error?: string }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/leads/${leadId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export interface OpportunityFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export async function createOpportunityAction(leadId: string, _prev: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  const parsed = opportunitySchema.safeParse({
    title: formData.get("title"),
    value: formData.get("value"),
    probability: formData.get("probability"),
    expectedCloseDate: formData.get("expectedCloseDate"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createOpportunityForLead(leadId, parsed.data);
    revalidatePath(`/leads/${leadId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateOpportunityStageAction(opportunityId: string, leadId: string, stage: OpportunityStage): Promise<{ error?: string }> {
  try {
    await updateOpportunityStage(opportunityId, stage);
    revalidatePath(`/leads/${leadId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteOpportunityAction(opportunityId: string, leadId: string): Promise<{ error?: string }> {
  try {
    await deleteOpportunity(opportunityId);
    revalidatePath(`/leads/${leadId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
