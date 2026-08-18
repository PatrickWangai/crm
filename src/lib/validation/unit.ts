import { z } from "zod";

export const UNIT_TYPES = ["Studio", "1BR", "2BR", "3BR", "4BR", "Penthouse", "Office", "Shop", "Warehouse Bay"] as const;
export const UNIT_STATUSES = ["OCCUPIED", "VACANT", "RESERVED", "UNDER_MAINTENANCE"] as const;

export const unitSchema = z.object({
  unitNumber: z.string().trim().min(1, "Unit number is required").max(30),
  unitType: z.string().trim().min(1, "Unit type is required").max(40),
  floor: z.string().trim().max(20).optional().or(z.literal("")),
  bedrooms: z.coerce.number().int().min(0).max(20).optional().or(z.literal("")),
  bathrooms: z.coerce.number().int().min(0).max(20).optional().or(z.literal("")),
  sizeSqm: z.coerce.number().min(0).max(100_000).optional().or(z.literal("")),
  rentAmount: z.coerce.number().min(0, "Rent cannot be negative").max(999_999_999),
  status: z.enum(UNIT_STATUSES),
});

export type UnitInput = z.infer<typeof unitSchema>;

export interface UnitFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  unitId?: string;
}
