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

export interface PublicSupportFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  ticketNumber?: string;
  expectedResponseBy?: string;
}

export const trackRequestSchema = z.object({
  ticketNumber: z.string().trim().min(1, "Enter your reference number"),
  email: z.string().trim().toLowerCase().email("Enter the email you used when submitting"),
});

export type TrackRequestInput = z.infer<typeof trackRequestSchema>;

export interface PublicTicketStatus {
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  publicComments: { comment: string; createdAt: string }[];
}

export interface TrackRequestFormState {
  error?: string;
  result?: PublicTicketStatus;
}
