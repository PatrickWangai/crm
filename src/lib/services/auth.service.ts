import "server-only";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit/log";

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }
  if (user.status !== "ACTIVE") {
    return { ok: false, error: "This account is not active. Contact your ICT administrator." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({
    userId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
  });

  return { ok: true };
}

export async function logout(userId?: string | null): Promise<void> {
  await destroySession();
  if (userId) {
    await recordAudit({ userId, action: "auth.logout", entityType: "User", entityId: userId });
  }
}
