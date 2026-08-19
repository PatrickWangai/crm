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
