"use client";

import { Dropdown } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { IconChevronDown } from "@/components/ui/icons";
import { mainNavItems, type NavItem } from "@/config/navigation";

interface NavLinksProps {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
  className?: string;
}

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A dropdown/group item is "active" whenever the current path matches any child's own path (query strings never factor into route matching). */
function isGroupActive(pathname: string, item: NavItem) {
  return (item.children ?? []).some((child) => isItemActive(pathname, child.href.split("?")[0]));
}

const linkClass = (isVertical: boolean, active: boolean) =>
  clsx(
    "rounded-sm text-small font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    isVertical && "block px-3 py-2",
    active ? "text-accent" : "text-foreground/70",
  );

/**
 * Shared main-nav link list — used by the desktop header row and the
 * mobile drawer body, so link targets and active-state logic live once.
 * Needs to be a Client Component for usePathname()-driven active styling.
 *
 * An item with `children` (currently just "Categories") renders as a
 * HeroUI dropdown on desktop (matching `SecondaryNav`'s existing "Browse
 * All Categories" pattern) and as a native `<details>` disclosure on
 * mobile — no extra JS state needed, and `<details>` is the right primitive
 * for "one collapsible section inside an already-scrollable drawer."
 */
export function NavLinks({ orientation = "horizontal", onNavigate, className }: NavLinksProps) {
  const pathname = usePathname();
  const isVertical = orientation === "vertical";

  return (
    <ul className={clsx("flex", isVertical ? "flex-col gap-1" : "items-center gap-6", className)}>
      {mainNavItems.map((item) => {
        if (item.children && item.children.length > 0) {
          const active = isGroupActive(pathname, item);

          if (isVertical) {
            return (
              <li key={item.label}>
                <details className="group">
                  <summary
                    className={clsx(
                      "flex cursor-pointer list-none items-center justify-between px-3 py-2 text-small font-medium transition-colors hover:text-accent",
                      active ? "text-accent" : "text-foreground/70",
                    )}
                  >
                    {item.label}
                    <IconChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="ml-2 border-l border-border pl-3">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <Link href={child.href} onClick={onNavigate} className={linkClass(true, isItemActive(pathname, child.href.split("?")[0]))}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          }

          return (
            <li key={item.label}>
              <Dropdown.Root>
                <Dropdown.Trigger
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-sm text-small font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                    active ? "text-accent" : "text-foreground/70",
                  )}
                >
                  {item.label}
                  <IconChevronDown className="size-3.5" />
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom start" className="min-w-56">
                  <Dropdown.Menu aria-label={item.label}>
                    {item.children.map((child) => (
                      <Dropdown.Item key={child.label} href={child.href} textValue={child.label}>
                        {child.label}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.Root>
            </li>
          );
        }

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
            <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={linkClass(isVertical, active)}>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
