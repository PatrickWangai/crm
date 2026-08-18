"use server";

import { revalidatePath } from "next/cache";
import { propertySchema, type PropertyFormState } from "@/lib/validation/property";
import { unitSchema, type UnitFormState } from "@/lib/validation/unit";
import { createProperty, deleteProperty, updateProperty } from "@/lib/services/property.service";
import { createUnit, deleteUnit, updateUnit } from "@/lib/services/unit.service";
import { deleteDocument, uploadDocument } from "@/lib/services/document.service";
import type { DocumentFormState } from "@/lib/validation/communication";

function toPropertyInput(formData: FormData) {
  return {
    name: formData.get("name"),
    propertyType: formData.get("propertyType"),
    address: formData.get("address"),
    city: formData.get("city"),
    region: formData.get("region"),
    businessUnitId: formData.get("businessUnitId"),
    landlordId: formData.get("landlordId"),
  };
}

function toUnitInput(formData: FormData) {
  return {
    unitNumber: formData.get("unitNumber"),
    unitType: formData.get("unitType"),
    floor: formData.get("floor"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    sizeSqm: formData.get("sizeSqm"),
    rentAmount: formData.get("rentAmount"),
    status: formData.get("status"),
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createPropertyAction(_prev: PropertyFormState, formData: FormData): Promise<PropertyFormState> {
  const parsed = propertySchema.safeParse(toPropertyInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const property = await createProperty(parsed.data);
    revalidatePath("/properties");
    return { success: true, propertyId: property.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updatePropertyAction(id: string, _prev: PropertyFormState, formData: FormData): Promise<PropertyFormState> {
  const parsed = propertySchema.safeParse(toPropertyInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateProperty(id, parsed.data);
    revalidatePath("/properties");
    revalidatePath(`/properties/${id}`);
    return { success: true, propertyId: id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deletePropertyAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteProperty(id);
    revalidatePath("/properties");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function createUnitAction(propertyId: string, _prev: UnitFormState, formData: FormData): Promise<UnitFormState> {
  const parsed = unitSchema.safeParse(toUnitInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const unit = await createUnit(propertyId, parsed.data);
    revalidatePath(`/properties/${propertyId}`);
    return { success: true, unitId: unit.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateUnitAction(id: string, propertyId: string, _prev: UnitFormState, formData: FormData): Promise<UnitFormState> {
  const parsed = unitSchema.safeParse(toUnitInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateUnit(id, parsed.data);
    revalidatePath(`/properties/${propertyId}`);
    revalidatePath(`/units/${id}`);
    return { success: true, unitId: id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteUnitAction(id: string, propertyId: string): Promise<{ error?: string }> {
  try {
    await deleteUnit(id);
    revalidatePath(`/properties/${propertyId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function uploadPropertyDocumentAction(propertyId: string, _prev: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Please choose a file to upload." };
  try {
    await uploadDocument({ propertyId }, file);
    revalidatePath(`/properties/${propertyId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deletePropertyDocumentAction(documentId: string, propertyId: string): Promise<{ error?: string }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/properties/${propertyId}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
