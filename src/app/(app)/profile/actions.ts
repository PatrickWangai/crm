"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { changeOwnPassword, updateOwnContactDetails } from "@/lib/services/user.service";
import { initiateTransfer, cancelTransfer, respondToTransfer, deleteOwnAccount, setNotificationDelegate } from "@/lib/services/transfer.service";

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

export interface SimpleActionState {
  error?: string;
  success?: boolean;
}

export async function initiateTransferAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const toUserId = String(formData.get("toUserId") ?? "");
  if (!toUserId) return { error: "Choose a successor first." };
  try {
    await initiateTransfer(toUserId);
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send that request." };
  }
}

export async function cancelTransferAction(requestId: string): Promise<SimpleActionState> {
  try {
    await cancelTransfer(requestId);
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not cancel that request." };
  }
}

export async function respondToTransferAction(requestId: string, accept: boolean): Promise<SimpleActionState> {
  try {
    await respondToTransfer(requestId, accept);
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not respond to that request." };
  }
}

export async function setNotificationDelegateAction(delegateUserId: string | null): Promise<SimpleActionState> {
  try {
    await setNotificationDelegate(delegateUserId);
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update your delegate." };
  }
}

export async function deleteOwnAccountAction(_prev: SimpleActionState, _formData: FormData): Promise<SimpleActionState> {
  try {
    await deleteOwnAccount();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not deactivate your account." };
  }
  redirect("/login");
}
