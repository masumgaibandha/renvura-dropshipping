import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic, cookie-presence-only redirect for the protected account and
 * admin areas — fast, no database call, but not authoritative (a forged/
 * expired cookie can still pass this check, and this can't tell a customer
 * cookie from an admin cookie at all — role isn't in the cookie). See
 * `src/app/account/layout.tsx` and `src/app/admin/layout.tsx`, which each
 * perform the real, authoritative server-side check (`getCurrentUser()`/
 * `requireAdmin()`) before any protected data is ever read; this is purely
 * a fast first gate, per Better Auth's own recommended layered approach.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
