"use server";

import { revalidatePath } from "next/cache";
import { createUserSchema } from "@/lib/validation/user";
import { createDepartmentTeamMember } from "@/lib/services/user.service";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/guard";

export interface TeamMemberFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  tempPassword?: string;
}

function friendlyError(err: unknown): string {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) return err.message;
  if (err instanceof Error) {
    if (err.message.includes("Unique constraint")) return "A user with this email already exists.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export async function createTeamMemberAction(_prev: TeamMemberFormState, formData: FormData): Promise<TeamMemberFormState> {
  const parsed = createUserSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    jobTitle: formData.get("jobTitle"),
    roleId: formData.get("roleId"),
    // departmentId/businessUnitId/reportingToId are intentionally not read
    // from the form — createDepartmentTeamMember forces them to the
    // actor's own department regardless of what's submitted.
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const { tempPassword } = await createDepartmentTeamMember(parsed.data);
    revalidatePath("/team");
    return { success: true, tempPassword };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
