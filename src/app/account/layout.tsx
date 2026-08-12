import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountLayout } from "@/components/account/AccountLayout";
import { getCurrentUser } from "@/lib/auth-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The authoritative auth check for the whole /account/* subtree —
 * `proxy.ts` already redirected unauthenticated requests based on cookie
 * presence alone (fast, not authoritative); this re-validates the session
 * server-side before any nested page ever runs. Individual pages still do
 * their own ownership checks (e.g. "does this order belong to *this*
 * user") — this layout only proves "someone is validly signed in."
 */
export default async function AccountRootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <AccountLayout isAdmin={user.role === "admin"}>{children}</AccountLayout>;
}
