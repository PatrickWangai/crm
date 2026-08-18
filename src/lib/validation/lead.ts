import { z } from "zod";

export const LEAD_SOURCES = [
  "WEBSITE",
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "EMAIL",
  "WALK_IN",
  "REFERRAL",
  "PROPERTY_INQUIRY",
  "CAMPAIGN",
  "OTHER",
] as const;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "NEGOTIATION",
  "VIEWING_SCHEDULED",
  "RESERVATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

export const leadSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  source: z.enum(LEAD_SOURCES),
  sourceDetail: z.string().trim().max(150).optional().or(z.literal("")),
  requirements: z.string().trim().max(1000).optional().or(z.literal("")),
  businessUnitId: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  nextFollowUpAt: z.string().optional().or(z.literal("")),
  interestedPropertyId: z.string().optional().or(z.literal("")),
  interestedUnitId: z.string().optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const leadStatusChangeSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type LeadStatusChangeInput = z.infer<typeof leadStatusChangeSchema>;

export const opportunitySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  value: z.coerce.number().min(0, "Value cannot be negative").max(999_999_999),
  probability: z.coerce.number().int().min(0).max(100),
  expectedCloseDate: z.string().optional().or(z.literal("")),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;
