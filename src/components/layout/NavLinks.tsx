"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { mainNavItems } from "@/config/navigation";

interface NavLinksProps {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
  className?: string;
}

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Shared main-nav link list — used by the desktop header row and the
 * mobile drawer body, so link targets and active-state logic live once.
 * Needs to be a Client Component for usePathname()-driven active styling.
 */
export function NavLinks({ orientation = "horizontal", onNavigate, className }: NavLinksProps) {
  const pathname = usePathname();
  const isVertical = orientation === "vertical";

  return (
    <ul className={clsx("flex", isVertical ? "flex-col gap-1" : "items-center gap-6", className)}>
      {mainNavItems.map((item) => {
        if (!item.href) {
          return (
            <li key={item.label}>
              <span
                aria-disabled="true"
                title="Coming soon"
                className={clsx(
                  "inline-flex items-center gap-1.5 text-small text-foreground/40",
                  isVertical && "px-3 py-2",
                )}
              >
                {item.label}
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[0.65rem] font-medium tracking-wide text-foreground/40 uppercase">
                  Soon
                </span>
              </span>
            </li>
          );
        }

        const active = isItemActive(pathname, item.href);

        return (
          <li key={item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "rounded-sm text-small font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                isVertical && "block px-3 py-2",
                active ? "text-accent" : "text-foreground/70",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
