import Image from "next/image";
import Link from "next/link";

import { HeaderAccountLink } from "@/components/account/HeaderAccountLink";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartIcon } from "@/components/cart/CartIcon";
import { SearchBar } from "@/components/ecommerce/SearchBar";
import { IconLinkButton } from "@/components/ui/IconLinkButton";
import { IconHeart } from "@/components/ui/icons";
import { WishlistCountBadge } from "@/components/wishlist/WishlistCountBadge";
import { brand } from "@/config/brand";
import { Container } from "./Container";
import { MobileDrawer, MobileMenuTrigger, MobileNavProvider, MobileSearchTrigger } from "./MobileNav";

/**
 * Sticky site header. The search field is the dominant center element
 * (reference layout), with primary nav living one row down in
 * SecondaryNav.tsx. Mobile shows a hamburger + search trigger that open
 * the shared drawer in MobileNav.tsx. See docs/DESIGN-SYSTEM.md for the
 * header rules (logo variant choice, sticky behavior, icon set).
 *
 * Phase 24 redesign: taller/more premium proportions (h-16→h-20 desktop),
 * a subtle shadow instead of relying on the border alone for depth, and a
 * bordered/elevated search field so it reads as the header's dominant
 * element rather than blending into the row.
 */
export function Header() {
  return (
    <MobileNavProvider>
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 shadow-[0_1px_0_rgba(17,24,39,0.04)] backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <Container>
          <div className="flex h-16 items-center gap-3 md:h-20 md:gap-8">
            <MobileMenuTrigger className="lg:hidden" />

            <Link href="/" aria-label={`${brand.name} home`} className="shrink-0">
              <Image src={brand.assets.logo.light} alt={brand.name} width={150} height={45} priority className="h-8 w-auto md:h-11" />
            </Link>

            <div className="hidden flex-1 md:block md:max-w-2xl">
              <SearchBar className="[&_[data-slot=search-field-group]]:h-11 [&_[data-slot=search-field-group]]:rounded-full [&_[data-slot=search-field-group]]:border-border [&_[data-slot=search-field-group]]:bg-surface-soft [&_[data-slot=search-field-group]]:shadow-none" />
            </div>

            <div className="ml-auto flex items-center gap-1 md:gap-2">
              <MobileSearchTrigger className="md:hidden" />
              <IconLinkButton href="/wishlist" aria-label="Wishlist" className="relative hidden md:inline-flex">
                <IconHeart className="size-5" />
                <WishlistCountBadge />
              </IconLinkButton>
              <div className="hidden md:inline-flex">
                <HeaderAccountLink />
              </div>
              <CartIcon />
            </div>
          </div>
        </Container>
      </header>

      <MobileDrawer />
      <CartDrawer />
    </MobileNavProvider>
  );
}
