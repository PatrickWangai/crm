"use server";

import { revalidatePath } from "next/cache";
import { deleteDocument, uploadDocument } from "@/lib/services/document.service";
import type { DocumentFormState } from "@/lib/validation/communication";

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function uploadUnitDocumentAction(unitId: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Please choose a file to upload." };
  try {
    await uploadDocument({ unitId }, file);
    revalidatePath(`/units/${unitId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteUnitDocumentAction(documentId: string, unitId: string): Promise<{ error?: string }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/units/${unitId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
