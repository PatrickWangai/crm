import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/help", "/api/public", "/privacy"];

/**
 * Edge-runtime UX redirect only: checks for the presence of the session
 * cookie so unauthenticated users bounce to /login immediately instead of
 * flashing protected UI. This is NOT the authorization boundary — every
 * Server Component, Server Action and Route Handler independently calls
 * getCurrentUser()/requirePermission() (Node runtime, DB-backed) before
 * touching data. See src/lib/rbac/guard.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublic && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo.jpeg).*)"],
};
