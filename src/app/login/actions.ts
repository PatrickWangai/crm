"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/lib/services/auth.service";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function loginAction(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/dashboard");
}
