"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { IconGrid, IconMapPin, IconPackage, IconUser } from "@/components/ui/icons";
import { SignOutButton } from "./SignOutButton";

export const accountNavItems = [
  { label: "My Account", href: "/account", icon: IconGrid },
  { label: "Orders", href: "/account/orders", icon: IconPackage },
  { label: "Addresses", href: "/account/addresses", icon: IconMapPin },
  { label: "Profile", href: "/account/profile", icon: IconUser },
];

function isAccountLinkActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar nav for the /account/* area. See AccountMobileNav.tsx for the small-screen equivalent. */
export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="flex flex-col gap-1">
      {accountNavItems.map((item) => {
        const active = isAccountLinkActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium transition-colors",
              active ? "bg-accent/10 text-accent" : "text-foreground/70 hover:bg-background-secondary hover:text-accent",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-2 border-t border-border pt-2">
        <SignOutButton />
      </div>
    </nav>
  );
}
