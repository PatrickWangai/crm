"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/lib/services/auth.service";

export async function logoutAction() {
  const user = await getCurrentUser();
  await logout(user?.id);
  redirect("/login");
}
