import { headers } from "next/headers";

import { auth } from "./auth";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

/**
 * The one place server-side code asks "who is signed in?" — every Server
 * Component/Action calls this instead of repeating `auth.api.getSession()`
 * + `headers()` itself, and it returns only the safe, minimal profile
 * shape (never the raw session object, which carries the session token —
 * that must never cross into a Client Component, the same rule this
 * project already applies to `wholesalePrice`).
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
  };
}
