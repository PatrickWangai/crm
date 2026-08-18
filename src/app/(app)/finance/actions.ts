"use server";

import { revalidatePath } from "next/cache";
import { invoiceSchema, paymentSchema, type InvoiceFormState, type PaymentFormState } from "@/lib/validation/finance";
import { createInvoice, recordPayment } from "@/lib/services/finance.service";

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
