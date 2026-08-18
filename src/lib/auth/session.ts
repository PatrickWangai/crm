import "server-only";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { signToken, verifyToken } from "./jwt";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type CurrentUser = Awaited<ReturnType<typeof loadUserWithAccess>>;

async function loadUserWithAccess(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
      department: true,
      businessUnit: true,
    },
  });
}

/**
 * Creates a DB-backed session (revocable) and sets the httpOnly session cookie.
 * Call from the login server action / route handler only.
 */
export async function createSession(userId: string) {
  const hdrs = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Create the session row first (id becomes the JWT `sid` claim), then patch tokenHash.
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: "pending",
      expiresAt,
      userAgent: hdrs.get("user-agent") ?? undefined,
      ipAddress: hdrs.get("x-forwarded-for") ?? undefined,
    },
  });

  const token = signToken({ sub: userId, sid: session.id });
  await prisma.session.update({
    where: { id: session.id },
    data: { tokenHash: hashToken(token) },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      await prisma.session.updateMany({
        where: { id: payload.sid },
        data: { revokedAt: new Date() },
      });
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Resolves the current authenticated user from the session cookie, enforcing:
 *  - valid JWT signature
 *  - session exists, is not revoked, and has not expired
 *  - the token hash matches the stored session (defense against forged/stale tokens)
 * Returns null when unauthenticated. This is the single source of truth for
 * "who is logged in" across server components, server actions and route handlers.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.tokenHash !== hashToken(token)) return null;

  const user = await loadUserWithAccess(payload.sub);
  if (!user || user.status !== "ACTIVE") return null;

  return user;
}

/** Flattened set of permission codes granted to a loaded user, e.g. "leads.create". */
export function permissionsOf(user: NonNullable<CurrentUser>): Set<string> {
  return new Set(user.role.rolePermissions.map((rp) => rp.permission.code));
}
