"use server";

import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@prisma/client";
import { ticketSchema, ticketStatusChangeSchema, ticketCommentSchema, type TicketFormState, type TicketCommentFormState } from "@/lib/validation/ticket";
import { communicationSchema, type CommunicationFormState, type DocumentFormState } from "@/lib/validation/communication";
import { assignTicket, addTicketComment, createTicket, deleteTicket, updateTicket, updateTicketStatus } from "@/lib/services/ticket.service";
import { logCommunication } from "@/lib/services/communication.service";
import { deleteDocument, uploadDocument } from "@/lib/services/document.service";

function toInput(formData: FormData) {
  return {
    stakeholderId: formData.get("stakeholderId"),
    subject: formData.get("subject"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    businessUnitId: formData.get("businessUnitId"),
    departmentId: formData.get("departmentId"),
    assignedToId: formData.get("assignedToId"),
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createTicketAction(_prev: TicketFormState, formData: FormData): Promise<TicketFormState> {
  const parsed = ticketSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const ticket = await createTicket(parsed.data);
    revalidatePath("/tickets");
    return { success: true, ticketId: ticket.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateTicketAction(id: string, _prev: TicketFormState, formData: FormData): Promise<TicketFormState> {
  const parsed = ticketSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateTicket(id, parsed.data);
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);
    return { success: true, ticketId: id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteTicketAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteTicket(id);
    revalidatePath("/tickets");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateTicketStatusAction(id: string, status: TicketStatus, note?: string): Promise<{ error?: string }> {
  const parsed = ticketStatusChangeSchema.safeParse({ status, note });
  if (!parsed.success) return { error: "Invalid status." };
  try {
    await updateTicketStatus(id, parsed.data.status, parsed.data.note);
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function assignTicketAction(id: string, assignedToId: string | null): Promise<{ error?: string }> {
  try {
    await assignTicket(id, assignedToId);
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function addTicketCommentAction(
  ticketId: string,
  _prev: TicketCommentFormState,
  formData: FormData,
): Promise<TicketCommentFormState> {
  const parsed = ticketCommentSchema.safeParse({
    comment: formData.get("comment"),
    isInternal: formData.get("isInternal") ?? "true",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await addTicketComment(ticketId, parsed.data.comment, parsed.data.isInternal === "true");
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function logTicketCommunicationAction(
  ticketId: string,
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
    await logCommunication({ ticketId }, parsed.data);
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function uploadTicketDocumentAction(ticketId: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  try {
    await uploadDocument({ ticketId }, file);
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteTicketDocumentAction(documentId: string, ticketId: string): Promise<{ error?: string }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/tickets/${ticketId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
