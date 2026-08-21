import { z } from "zod";
import { TICKET_CATEGORIES } from "./ticket";

export const publicSupportRequestSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(60),
    lastName: z.string().trim().min(1, "Last name is required").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
    phone: z.string().trim().min(7, "Enter a valid phone number").max(20).optional().or(z.literal("")),
    businessUnitId: z.string().optional().or(z.literal("")),
    category: z.enum(TICKET_CATEGORIES),
    subject: z.string().trim().min(1, "Subject is required").max(150),
    description: z.string().trim().min(10, "Please provide a few more details (at least 10 characters)").max(2000),
  })
  .refine((data) => !!data.email || !!data.phone, {
    message: "Provide an email or phone number so we can follow up",
    path: ["email"],
  });

export type PublicSupportRequestInput = z.infer<typeof publicSupportRequestSchema>;

export const trackRequestSchema = z.object({
  ticketNumber: z.string().trim().min(1, "Enter your reference number"),
  email: z.string().trim().toLowerCase().email("Enter the email you used when submitting"),
});

export type TrackRequestInput = z.infer<typeof trackRequestSchema>;

export interface PublicTicketStatus {
  ticketNumber: string;
  subject: string;
  category: string;
  // Deliberately no `priority` — internal triage detail, only depts should
  // see it (SLA timing is still surfaced via expectedResponseBy).
  status: string;
  stage: 1 | 2 | 3;
  stageLabel: string;
  businessUnitName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  expectedResponseBy: string | null;
  publicComments: { comment: string; createdAt: string }[];
}

export interface TrackRequestFormState {
  error?: string;
  result?: PublicTicketStatus;
  email?: string;
}

export interface PublicSupportFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  ticketNumber?: string;
  expectedResponseBy?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** Live tracking snapshot for the just-created ticket, so the submitter sees real status immediately without re-entering their reference number and email. */
  tracking?: PublicTicketStatus;
}

/**
 * Reviews are only reachable via the link in the "your request is done"
 * email, which already carries ticketNumber + email — same (ticketNumber,
 * email) shared-secret pairing the public tracker uses, so no separate
 * token/login is needed to prove this is the real submitter.
 */
export const submitReviewSchema = z.object({
  ticketNumber: z.string().trim().min(1, "Missing reference number"),
  email: z.string().trim().toLowerCase().email("Missing a valid email"),
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5, "Choose a star rating"),
  comment: z.string().trim().max(1000, "Keep it under 1000 characters").optional().or(z.literal("")),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export interface SubmitReviewFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

/** Same (ticketNumber, email) shared-secret pairing as the tracker itself — sending a live-chat message doesn't need a separate login. */
export const sendCustomerChatMessageSchema = z.object({
  ticketNumber: z.string().trim().min(1, "Missing reference number"),
  email: z.string().trim().toLowerCase().email("Missing a valid email"),
  content: z.string().trim().min(1, "Type a message first").max(1000, "Keep it under 1000 characters"),
});

export type SendCustomerChatMessageInput = z.infer<typeof sendCustomerChatMessageSchema>;

export interface LiveChatMessage {
  id: string;
  from: "customer" | "staff";
  content: string;
  occurredAt: string;
}

export interface SendChatMessageFormState {
  error?: string;
  success?: boolean;
}
