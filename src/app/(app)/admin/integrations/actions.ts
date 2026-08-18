"use server";

import { revalidatePath } from "next/cache";
import { integrationConfigSchema, type IntegrationFormState } from "@/lib/validation/integration";
import { testIntegrationConnection, updateIntegrationConfig } from "@/lib/services/integration.service";

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function updateIntegrationConfigAction(id: string, _prev: IntegrationFormState, formData: FormData): Promise<IntegrationFormState> {
  const parsed = integrationConfigSchema.safeParse({
    status: formData.get("status"),
    endpoint: formData.get("endpoint"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateIntegrationConfig(id, parsed.data);
    revalidatePath("/admin/integrations");
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function testIntegrationConnectionAction(id: string): Promise<{ error?: string }> {
  try {
    await testIntegrationConnection(id);
    revalidatePath("/admin/integrations");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
