"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeaseStatus } from "@prisma/client";
import { leaseSchema, leaseStatusChangeSchema, type LeaseFormState } from "@/lib/validation/lease";
import { createLease, flagExpiringLeases, updateLease, updateLeaseStatus } from "@/lib/services/lease.service";
import { deleteDocument, uploadDocument } from "@/lib/services/document.service";
import type { DocumentFormState } from "@/lib/validation/communication";

function toInput(formData: FormData) {
  return {
    unitId: formData.get("unitId"),
    tenantId: formData.get("tenantId"),
    landlordId: formData.get("landlordId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    rentAmount: formData.get("rentAmount"),
    depositAmount: formData.get("depositAmount"),
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createLeaseAction(_prev: LeaseFormState, formData: FormData): Promise<LeaseFormState> {
  const parsed = leaseSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let leaseId: string;
  try {
    const lease = await createLease(parsed.data);
    leaseId = lease.id;
  } catch (err) {
    return { error: friendlyError(err) };
  }

  // Redirect server-side (rather than client-side after a success state) because
  // creating a lease flips the unit to OCCUPIED, which unmounts this very form's
  // trigger (only shown for VACANT units) before a client-side effect could fire.
  revalidatePath("/leases");
  revalidatePath(`/units/${parsed.data.unitId}`);
  redirect(`/leases/${leaseId}`);
}

export async function updateLeaseAction(id: string, _prev: LeaseFormState, formData: FormData): Promise<LeaseFormState> {
  const parsed = leaseSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateLease(id, parsed.data);
    revalidatePath("/leases");
    revalidatePath(`/leases/${id}`);
    return { success: true, leaseId: id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateLeaseStatusAction(id: string, status: LeaseStatus): Promise<{ error?: string }> {
  const parsed = leaseStatusChangeSchema.safeParse({ status });
  if (!parsed.success) return { error: "Invalid status." };
  try {
    await updateLeaseStatus(id, parsed.data.status);
    revalidatePath("/leases");
    revalidatePath(`/leases/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function checkExpiringLeasesAction(): Promise<{ error?: string; flagged?: number }> {
  try {
    const flagged = await flagExpiringLeases(30);
    revalidatePath("/leases");
    return { flagged };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function uploadLeaseDocumentAction(leaseId: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Please choose a file to upload." };
  try {
    await uploadDocument({ leaseId }, file);
    revalidatePath(`/leases/${leaseId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteLeaseDocumentAction(documentId: string, leaseId: string): Promise<{ error?: string }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/leases/${leaseId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
