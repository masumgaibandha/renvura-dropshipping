"use client";

import { Button, Drawer, useOverlayState } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { SignOutButton } from "@/components/account/SignOutButton";
import { IconMenu } from "@/components/ui/icons";
import { adminNavItems, isAdminLinkActive } from "./adminNav";

interface AdminTopBarProps {
  adminName: string;
  adminEmail: string;
}

/**
 * Top bar for every /admin/* page, all breakpoints. On mobile it also owns
 * the hamburger trigger + drawer (self-contained: unlike the storefront's
 * split Header/MobileNav, there's only one trigger here so a shared context
 * isn't needed) — the drawer holds the same nav `AdminSidebar` shows on
 * desktop, since there's no room for a persistent sidebar below `lg:`.
 */
export function AdminTopBar({ adminName, adminEmail }: AdminTopBarProps) {
  const state = useOverlayState();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
      <Button variant="ghost" size="md" isIconOnly aria-label="Open admin menu" className="lg:hidden" onPress={state.open}>
        <IconMenu className="size-5" />
      </Button>

      <Link href="/admin" className="text-small font-semibold text-foreground">
        Renvura Admin
      </Link>

      <div className="ml-auto flex items-center gap-3 text-right">
        <div className="hidden sm:block">
          <p className="text-small font-medium text-foreground">{adminName}</p>
          <p className="text-xs text-foreground/70">{adminEmail}</p>
        </div>
      </div>

      <Drawer.Root state={state}>
        <Drawer.Trigger className="hidden" />
        <Drawer.Backdrop>
          <Drawer.Content placement="left" className="w-[85vw] max-w-xs">
            <Drawer.Dialog className="flex h-full flex-col bg-ink text-white">
              <Drawer.Header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <span className="text-small font-semibold">Renvura Admin</span>
                <Drawer.CloseTrigger aria-label="Close menu" className="text-white" />
              </Drawer.Header>
              <Drawer.Body className="flex-1 overflow-y-auto px-2 py-3">
                <nav aria-label="Admin" className="flex flex-col gap-1">
                  {adminNavItems.map((item) => {
                    const active = isAdminLinkActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={state.close}
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
                </nav>
              </Drawer.Body>
              <Drawer.Footer className="border-t border-white/10 px-2 py-3">
                <Link
                  href="/"
                  className="flex items-center rounded-lg px-3 py-2 text-small font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  View Storefront
                </Link>
                <SignOutButton className="text-white/70 hover:bg-white/5 hover:text-white" />
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer.Root>
    </header>
  );
}
