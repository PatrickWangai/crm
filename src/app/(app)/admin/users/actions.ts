"use server";

import { revalidatePath } from "next/cache";
import type { UserStatus } from "@prisma/client";
import { createUserSchema, updateUserSchema } from "@/lib/validation/user";
import { createUser, resetUserPassword, setUserStatus, updateUser } from "@/lib/services/user.service";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/guard";

export interface UserFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  tempPassword?: string;
}

function toInput(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    jobTitle: formData.get("jobTitle"),
    roleId: formData.get("roleId"),
    departmentId: formData.get("departmentId"),
    businessUnitId: formData.get("businessUnitId"),
    reportingToId: formData.get("reportingToId"),
  };
}

function friendlyError(err: unknown): string {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) return err.message;
  if (err instanceof Error) {
    if (err.message.includes("Unique constraint")) return "A user with this email already exists.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const parsed = createUserSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const { tempPassword } = await createUser(parsed.data);
    revalidatePath("/admin/users");
    return { success: true, tempPassword };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateUserAction(userId: string, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const parsed = updateUserSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await updateUser(userId, parsed.data);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function setUserStatusAction(userId: string, status: UserStatus) {
  await setUserStatus(userId, status);
  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(userId: string): Promise<{ tempPassword: string }> {
  const result = await resetUserPassword(userId);
  revalidatePath("/admin/users");
  return result;
}
