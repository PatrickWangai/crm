import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers and underscores only"),
  businessUnitId: z.string().optional().or(z.literal("")),
});

export const businessUnitUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type BusinessUnitUpdateInput = z.infer<typeof businessUnitUpdateSchema>;
export type RoleInput = z.infer<typeof roleSchema>;
