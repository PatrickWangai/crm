"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changeOwnPassword, updateOwnContactDetails } from "@/lib/services/user.service";

export interface PasswordFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await changeOwnPassword(parsed.data.currentPassword, parsed.data.newPassword);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update password." };
  }
}

export async function updatePhoneAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  await updateOwnContactDetails(phone);
  revalidatePath("/profile");
}
