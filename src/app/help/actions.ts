"use server";

import {
  publicSupportRequestSchema,
  trackRequestSchema,
  type PublicSupportFormState,
  type TrackRequestFormState,
} from "@/lib/validation/public-support";
import { submitPublicSupportRequest, trackPublicSupportRequest } from "@/lib/services/public-support.service";

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function submitPublicSupportRequestAction(_prev: PublicSupportFormState, formData: FormData): Promise<PublicSupportFormState> {
  // Honeypot: a real visitor never fills this hidden field. Bots that do get a
  // fake "success" response so they don't learn to leave it empty next time.
  if (formData.get("companyWebsite")) {
    return { success: true, ticketNumber: "TKT-000000" };
  }

  const parsed = publicSupportRequestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    businessUnitId: formData.get("businessUnitId"),
    category: formData.get("category"),
    subject: formData.get("subject"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const result = await submitPublicSupportRequest(parsed.data);
    return {
      success: true,
      ticketNumber: result.ticketNumber,
      expectedResponseBy: result.expectedResponseBy ? result.expectedResponseBy.toISOString() : undefined,
    };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function trackPublicSupportRequestAction(_prev: TrackRequestFormState, formData: FormData): Promise<TrackRequestFormState> {
  const parsed = trackRequestSchema.safeParse({
    ticketNumber: formData.get("ticketNumber"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };

  const result = await trackPublicSupportRequest(parsed.data.ticketNumber, parsed.data.email);
  if (!result) return { error: "We couldn't find a request matching that reference number and email." };

  return { result };
}

export interface ChatTicketInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  category: string;
  description: string;
}

export type ChatTicketResult = { ok: true; ticketNumber: string; expectedResponseBy?: string } | { ok: false; error: string };

/**
 * Same underlying flow as submitPublicSupportRequestAction, but for the
 * chatbot widget, which collects fields turn-by-turn rather than via a
 * single <form> submit — so it calls the service directly with a plain
 * object instead of reading FormData. Subject is derived from the
 * description to keep the conversation short (no separate "subject" turn).
 */
export async function chatCreateTicketAction(input: ChatTicketInput): Promise<ChatTicketResult> {
  const subject = input.description.length > 80 ? `${input.description.slice(0, 80)}…` : input.description;

  const parsed = publicSupportRequestSchema.safeParse({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email ?? "",
    phone: input.phone ?? "",
    businessUnitId: "",
    category: input.category,
    subject,
    description: input.description,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the details and try again." };

  try {
    const result = await submitPublicSupportRequest(parsed.data);
    return { ok: true, ticketNumber: result.ticketNumber, expectedResponseBy: result.expectedResponseBy ? result.expectedResponseBy.toISOString() : undefined };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export type ChatTrackResult = { ok: true; result: NonNullable<Awaited<ReturnType<typeof trackPublicSupportRequest>>> } | { ok: false };

export async function chatTrackTicketAction(ticketNumber: string, email: string): Promise<ChatTrackResult> {
  const parsed = trackRequestSchema.safeParse({ ticketNumber, email });
  if (!parsed.success) return { ok: false };

  const result = await trackPublicSupportRequest(parsed.data.ticketNumber, parsed.data.email);
  if (!result) return { ok: false };
  return { ok: true, result };
}
