import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, permissionsOf, type CurrentUser } from "@/lib/auth/session";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * For use in Server Components / layouts: resolves the current user or
 * redirects to /login. This is the primary gate for page-level access.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * For use in Route Handlers / Server Actions where a redirect is not
 * appropriate: throws instead of redirecting so callers can map to a
 * proper HTTP status / error response.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export function hasPermission(user: NonNullable<CurrentUser>, code: string): boolean {
  return permissionsOf(user).has(code);
}

export function hasAnyPermission(user: NonNullable<CurrentUser>, codes: string[]): boolean {
  const granted = permissionsOf(user);
  return codes.some((code) => granted.has(code));
}

/**
 * Enforces a permission for the current request. Throws ForbiddenError
 * (caught by route handlers / server actions and mapped to HTTP 403) rather
 * than silently hiding UI — the blueprint requires backend-layer enforcement,
 * not just conditional rendering.
 */
export async function requirePermission(code: string) {
  const user = await requireAuth();
  if (!hasPermission(user, code)) {
    throw new ForbiddenError(`Missing permission: ${code}`);
  }
  return user;
}

export async function requireAnyPermission(codes: string[]) {
  const user = await requireAuth();
  if (!hasAnyPermission(user, codes)) {
    throw new ForbiddenError(`Missing one of permissions: ${codes.join(", ")}`);
  }
  return user;
}

/** Server Component variant: redirects to /login or /forbidden instead of throwing. */
export async function requirePermissionOrRedirect(code: string) {
  const user = await requireUser();
  if (!hasPermission(user, code)) redirect("/forbidden");
  return user;
}

export async function requireAnyPermissionOrRedirect(codes: string[]) {
  const user = await requireUser();
  if (!hasAnyPermission(user, codes)) redirect("/forbidden");
  return user;
}
