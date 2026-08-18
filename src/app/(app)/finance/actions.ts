"use server";

import { revalidatePath } from "next/cache";
import {
  invoiceSchema,
  paymentSchema,
  disbursementSchema,
  type InvoiceFormState,
  type PaymentFormState,
  type DisbursementFormState,
} from "@/lib/validation/finance";
import {
  approveInvoice,
  createDisbursement,
  createInvoice,
  markDisbursementPaid,
  recordPayment,
  rejectInvoice,
  toggleReconcilePayment,
} from "@/lib/services/finance.service";

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createInvoiceAction(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const parsed = invoiceSchema.safeParse({
    stakeholderId: formData.get("stakeholderId"),
    leaseId: formData.get("leaseId") ?? "",
    businessUnitId: formData.get("businessUnitId") ?? "",
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createInvoice(parsed.data);
    revalidatePath("/finance");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function approveInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  try {
    await approveInvoice(invoiceId);
    revalidatePath("/finance");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function rejectInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  try {
    await rejectInvoice(invoiceId);
    revalidatePath("/finance");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function recordPaymentAction(invoiceId: string, _prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const parsed = paymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await recordPayment(invoiceId, parsed.data);
    revalidatePath("/finance");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function toggleReconcilePaymentAction(paymentId: string): Promise<{ error?: string }> {
  try {
    await toggleReconcilePayment(paymentId);
    revalidatePath("/finance");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function createDisbursementAction(_prev: DisbursementFormState, formData: FormData): Promise<DisbursementFormState> {
  const parsed = disbursementSchema.safeParse({
    landlordId: formData.get("landlordId"),
    propertyId: formData.get("propertyId") ?? "",
    periodLabel: formData.get("periodLabel"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createDisbursement(parsed.data);
    revalidatePath("/finance");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function markDisbursementPaidAction(id: string): Promise<{ error?: string }> {
  try {
    await markDisbursementPaid(id);
    revalidatePath("/finance");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
