"use client";

import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";

import { IconChevronDown, IconUser } from "@/components/ui/icons";
import { signOut, useSession } from "@/lib/auth-client";

const linkClass =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-foreground/80 transition-colors hover:bg-background-secondary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Client Component using Better Auth's `useSession()` hook directly —
 * deliberately not fed a server-fetched session from `Header.tsx`, so
 * `Header` stays a plain Server Component and the public storefront pages
 * that render it keep their existing static-generation eligibility. This
 * accepts the same brief hydration flash already accepted for cart/
 * wishlist counts elsewhere in this app — it's a display convenience;
 * every real protected read (`/account/*`) independently re-validates the
 * session server-side regardless of what this widget shows.
 */
export function HeaderAccountLink() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (!session) {
    return (
      <a href="/login" className={linkClass}>
        <IconUser className="size-5" />
        <span className="text-small font-medium">Login</span>
      </a>
    );
  }

  const firstName = session.user.name.split(" ")[0] || "Account";

  return (
    <Dropdown.Root>
      <Dropdown.Trigger className={linkClass}>
        <IconUser className="size-5" />
        <span className="text-small font-medium">{firstName}</span>
        <IconChevronDown className="size-3.5" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="min-w-48">
        <Dropdown.Menu aria-label="Account menu">
          <Dropdown.Item href="/account" textValue="My Account">
            My Account
          </Dropdown.Item>
          <Dropdown.Item href="/account/orders" textValue="Orders">
            Orders
          </Dropdown.Item>
          <Dropdown.Item onAction={handleSignOut} textValue="Sign Out">
            Sign Out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
