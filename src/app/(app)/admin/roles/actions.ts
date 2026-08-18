"use server";

import { revalidatePath } from "next/cache";
import { roleSchema } from "@/lib/validation/org";
import { createRole, deleteRole, setRolePermission } from "@/lib/services/role.service";

export interface RoleFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export async function createRoleAction(_prev: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createRole(parsed.data);
    revalidatePath("/admin/roles");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create role." };
  }
}

export async function deleteRoleAction(roleId: string): Promise<{ error?: string }> {
  try {
    await deleteRole(roleId);
    revalidatePath("/admin/roles");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete role." };
  }
}

export async function toggleRolePermissionAction(roleId: string, permissionId: string, granted: boolean) {
  await setRolePermission(roleId, permissionId, granted);
  revalidatePath(`/admin/roles/${roleId}`);
}
