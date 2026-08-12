"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { IconShieldCheck } from "@/components/ui/icons";
import { accountNavItems } from "./AccountSidebar";

function isAccountLinkActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface AccountMobileNavProps {
  /** Server-derived from `getCurrentUser()` (see AccountLayout.tsx) — never trusted from the client. Purely a navigation convenience: `/admin/layout.tsx` independently re-checks role on every request. */
  isAdmin?: boolean;
}

/** Horizontal scrollable pill nav for the /account/* area on small screens — same idiom as CategoryTabs.tsx. This is also an authenticated admin's path to /admin on mobile (there's no separate admin entry in the main storefront drawer — see MobileNav.tsx). */
export function AccountMobileNav({ isAdmin = false }: AccountMobileNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {isAdmin && (
        <Link
          href="/admin"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent px-4 py-1.5 text-small font-medium text-accent transition-colors hover:bg-accent/10"
        >
          <IconShieldCheck className="size-4" />
          Admin Dashboard
        </Link>
      )}
      {accountNavItems.map((item) => {
        const active = isAccountLinkActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "shrink-0 rounded-full border px-4 py-1.5 text-small font-medium transition-colors",
              active ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground/70 hover:border-accent hover:text-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
