"use client";

import { Button, Drawer, IconSearch, useOverlayState, type UseOverlayStateReturn } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { createContext, use, type ReactNode } from "react";

import { CartCountBadge } from "@/components/cart/CartCountBadge";
import { IconLinkButton } from "@/components/ui/IconLinkButton";
import { IconBag, IconHeart, IconMenu, IconUser } from "@/components/ui/icons";
import { SearchBar } from "@/components/ecommerce/SearchBar";
import { WishlistCountBadge } from "@/components/wishlist/WishlistCountBadge";
import { brand } from "@/config/brand";
import { useSession } from "@/lib/auth-client";
import { NavLinks } from "./NavLinks";

/**
 * Mobile chrome (hamburger trigger, search trigger, and the drawer they
 * both open) as one module so the two triggers and the drawer content can
 * share a single open/close state via context, while staying composable
 * at the exact DOM positions Header.tsx needs them in.
 */

const MobileNavContext = createContext<UseOverlayStateReturn | null>(null);

function useMobileNav() {
  const context = use(MobileNavContext);
  if (!context) {
    throw new Error("Mobile nav trigger/drawer used outside <MobileNavProvider>");
  }
  return context;
}

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const state = useOverlayState();
  return <MobileNavContext value={state}>{children}</MobileNavContext>;
}

export function MobileMenuTrigger({ className }: { className?: string }) {
  const state = useMobileNav();
  return (
    <Button variant="ghost" size="md" isIconOnly aria-label="Open menu" className={className} onPress={state.open}>
      <IconMenu className="size-5" />
    </Button>
  );
}

export function MobileSearchTrigger({ className }: { className?: string }) {
  const state = useMobileNav();
  return (
    <Button variant="ghost" size="md" isIconOnly aria-label="Search" className={className} onPress={state.open}>
      <IconSearch className="size-5" />
    </Button>
  );
}

export function MobileDrawer() {
  const state = useMobileNav();
  const { data: session } = useSession();

  return (
    <Drawer.Root state={state}>
      {/*
        react-aria's DialogTrigger always wraps its children in a
        PressResponder expecting a pressable trigger descendant. The real
        triggers (MobileMenuTrigger/MobileSearchTrigger) live elsewhere in
        the header, so this hidden trigger only exists to satisfy that
        internal wiring — it's inert and never shown or reachable.
      */}
      <Drawer.Trigger className="hidden" />
      <Drawer.Backdrop>
        <Drawer.Content placement="left" className="w-[85vw] max-w-sm">
          <Drawer.Dialog className="flex h-full flex-col">
            <Drawer.Header className="flex items-center justify-between border-b border-border px-4 py-4">
              <Link href="/" onClick={state.close} aria-label={`${brand.name} home`}>
                <Image src={brand.assets.logo.light} alt={brand.name} width={140} height={42} />
              </Link>
              <Drawer.CloseTrigger aria-label="Close menu" />
            </Drawer.Header>

            <Drawer.Body className="flex-1 overflow-y-auto px-4 py-4">
              <SearchBar className="mb-6" />
              <nav aria-label="Main">
                <NavLinks orientation="vertical" onNavigate={state.close} />
              </nav>
            </Drawer.Body>

            <Drawer.Footer className="border-t border-border px-2 py-3">
              <div className="flex items-center justify-around">
                <IconLinkButton href="/wishlist" aria-label="Wishlist" className="relative">
                  <IconHeart className="size-5" />
                  <WishlistCountBadge />
                </IconLinkButton>
                <IconLinkButton href={session ? "/account" : "/login"} aria-label="Account">
                  <IconUser className="size-5" />
                </IconLinkButton>
                <IconLinkButton href="/cart" aria-label="Cart" className="relative">
                  <IconBag className="size-5" />
                  <CartCountBadge />
                </IconLinkButton>
              </div>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}
