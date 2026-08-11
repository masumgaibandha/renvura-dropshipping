"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { accountNavItems } from "./AccountSidebar";

function isAccountLinkActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Horizontal scrollable pill nav for the /account/* area on small screens — same idiom as CategoryTabs.tsx. */
export function AccountMobileNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
