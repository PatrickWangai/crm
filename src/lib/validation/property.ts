import { z } from "zod";

export const PROPERTY_TYPES = ["Apartment", "Commercial", "Estate", "Mixed-Use", "Land", "Warehouse", "Office Park"] as const;

export const propertySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  propertyType: z.string().trim().min(1, "Property type is required").max(60),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  businessUnitId: z.string().optional().or(z.literal("")),
  landlordId: z.string().optional().or(z.literal("")),
  ezenPropertyRef: z.string().trim().max(60).optional().or(z.literal("")),
});

export type PropertyInput = z.infer<typeof propertySchema>;

export interface PropertyFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  propertyId?: string;
}
