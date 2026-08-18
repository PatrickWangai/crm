import { z } from "zod";

export const invoiceSchema = z.object({
  stakeholderId: z.string().trim().min(1, "Select a stakeholder"),
  leaseId: z.string().optional().or(z.literal("")),
  businessUnitId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0").max(999_999_999),
  dueDate: z.string().trim().min(1, "Due date is required"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0").max(999_999_999),
  method: z.enum(["CASH", "BANK_TRANSFER", "MPESA", "CARD", "CHEQUE", "OTHER"]),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export interface InvoiceFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export interface PaymentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export const disbursementSchema = z.object({
  landlordId: z.string().trim().min(1, "Select a landlord"),
  propertyId: z.string().optional().or(z.literal("")),
  periodLabel: z.string().trim().min(1, "Period is required").max(60),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0").max(999_999_999),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DisbursementInput = z.infer<typeof disbursementSchema>;

export interface DisbursementFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
