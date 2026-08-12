import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { getCurrentUser } from "@/lib/auth-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The authoritative auth+role check for the whole /admin/* subtree —
 * `proxy.ts` already redirected requests with no session cookie at all
 * (fast, cookie-presence-only, not role-aware); this re-validates the
 * session server-side and checks `role === "admin"` before any admin page
 * or nested layout ever runs. A signed-in non-admin gets the identical
 * `notFound()` a mismatched-ownership resource gets elsewhere in this app
 * (`/account/orders/[orderNumber]`, saved addresses) — never a 403 that
 * would confirm "this route exists, you're just not allowed." Every admin
 * Server Action still calls `requireAdmin()` again independently — this
 * layout only proves "the current request reached a page," never
 * authorizes a mutation on its own.
 */
export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/admin");
  }
  if (user.role !== "admin") {
    notFound();
  }

  return (
    <AdminLayout adminName={user.name} adminEmail={user.email}>
      {children}
    </AdminLayout>
  );
}
