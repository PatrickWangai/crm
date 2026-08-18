import { z } from "zod";

export const STAKEHOLDER_TYPES = [
  "CUSTOMER",
  "TENANT",
  "LANDLORD",
  "SACCO_MEMBER",
  "INSURANCE_CLIENT",
  "INVESTOR",
  "PROSPECT",
  "OTHER",
] as const;

export const stakeholderSchema = z.object({
  type: z.enum(STAKEHOLDER_TYPES),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  organization: z.string().trim().max(150).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  alternatePhone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  idNumber: z.string().trim().max(40).optional().or(z.literal("")),
  kraPin: z.string().trim().max(40).optional().or(z.literal("")),
  businessUnitId: z.string().optional().or(z.literal("")),
  assignedStaffId: z.string().optional().or(z.literal("")),
});

export type StakeholderInput = z.infer<typeof stakeholderSchema>;

export const communicationSchema = z.object({
  channel: z.enum(["CALL", "EMAIL", "SMS", "WHATSAPP", "MEETING", "NOTE", "WALK_IN"]),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  content: z.string().trim().min(1, "Details are required").max(2000),
  occurredAt: z.string().optional().or(z.literal("")),
});

export type CommunicationInput = z.infer<typeof communicationSchema>;

export const notesSchema = z.object({
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});
