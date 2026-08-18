import { z } from "zod";

export const LEASE_STATUSES = ["ACTIVE", "EXPIRED", "TERMINATED", "PENDING_RENEWAL"] as const;

export const leaseSchema = z
  .object({
    unitId: z.string().trim().min(1, "Select a unit"),
    tenantId: z.string().trim().min(1, "Select a tenant"),
    landlordId: z.string().optional().or(z.literal("")),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().trim().min(1, "End date is required"),
    rentAmount: z.coerce.number().min(0, "Rent cannot be negative").max(999_999_999),
    depositAmount: z.coerce.number().min(0).max(999_999_999).optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export type LeaseInput = z.infer<typeof leaseSchema>;

export const leaseStatusChangeSchema = z.object({
  status: z.enum(LEASE_STATUSES),
});

export interface LeaseFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  leaseId?: string;
}
