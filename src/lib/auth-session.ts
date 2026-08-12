import { headers } from "next/headers";

import { auth } from "./auth";

export type UserRole = "customer" | "admin";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

function normalizeRole(role: unknown): UserRole {
  return role === "admin" ? "admin" : "customer";
}

/**
 * The one place server-side code asks "who is signed in?" — every Server
 * Component/Action calls this instead of repeating `auth.api.getSession()`
 * + `headers()` itself, and it returns only the safe, minimal profile
 * shape (never the raw session object, which carries the session token —
 * that must never cross into a Client Component, the same rule this
 * project already applies to `wholesalePrice`). `role` is normalized to a
 * known value here so a malformed/legacy DB value can never silently grant
 * admin — anything other than the literal string `"admin"` is treated as
 * `"customer"`.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    phone: session.user.phone ?? null,
    role: normalizeRole(session.user.role),
  };
}

/** Same as `getCurrentUser()`, but returns `null` for a signed-in non-admin instead of their profile — use when a caller only cares "is this an admin," never for authorization by itself (see `requireAdmin()`). */
export async function getCurrentAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export class AdminAuthorizationError extends Error {
  constructor(reason: "unauthenticated" | "forbidden") {
    super(reason === "unauthenticated" ? "Sign-in required." : "Admin access required.");
    this.name = "AdminAuthorizationError";
  }
}

/**
 * The single server-side authorization gate for every admin surface —
 * `src/app/admin/layout.tsx` calls this to protect all pages under
 * `/admin/*`, and every admin Server Action calls it again independently
 * at the top of the function body (never trust that the layout ran; a
 * Server Action is reachable directly by anyone who can POST to it,
 * layout or no layout). Throws rather than returning a nullable value so a
 * forgotten check fails loudly instead of silently proceeding with `null`.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AdminAuthorizationError("unauthenticated");
  }
  if (user.role !== "admin") {
    throw new AdminAuthorizationError("forbidden");
  }
  return user;
}
