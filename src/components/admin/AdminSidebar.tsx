"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { SignOutButton } from "@/components/account/SignOutButton";
import { adminNavItems, isAdminLinkActive } from "./adminNav";

/** Desktop sidebar nav for /admin/*. Dark surface (`bg-ink`) so the admin shell reads as visually distinct from the light storefront chrome — same near-black token the footer/announcement bar already use. */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex h-full flex-col gap-1 bg-ink px-3 py-4 text-white">
      {adminNavItems.map((item) => {
        const active = isAdminLinkActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-small font-medium transition-colors",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-white/10 pt-2">
        <Link href="/" className="flex items-center rounded-lg px-3 py-2 text-small font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white">
          View Storefront
        </Link>
        <SignOutButton className="text-white/70 hover:bg-white/5 hover:text-white" />
      </div>
    </nav>
  );
}
