import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  roleId: z.string().min(1, "Role is required"),
  departmentId: z.string().optional().or(z.literal("")),
  businessUnitId: z.string().optional().or(z.literal("")),
  reportingToId: z.string().optional().or(z.literal("")),
});

export const updateUserSchema = createUserSchema.partial({ email: true }).extend({
  email: z.string().trim().min(1).email().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
