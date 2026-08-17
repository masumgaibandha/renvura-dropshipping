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
import { NavLinks } from "./NavLinks";

/**
 * The single sticky navbar for the whole storefront — logo, search, primary
 * nav (Home/Shop/Categories), and account/wishlist/cart all live in this
 * one row. This replaces the previous three-layer stack (a dark utility
 * bar with About/Contact/Order Tracking/currency, this header, and a
 * separate "Browse All Categories" + nav row underneath): that stack read
 * as busy and not premium, and none of the removed utility-bar links were
 * unique to it — About Us/Contact Us are already in the footer, and Order
 * Tracking now is too (see Footer.tsx). The old secondary row's category
 * dropdown is gone entirely; NavLinks' existing "Categories" dropdown
 * (rendered inline here, to the right of Home/Shop) is the only one left.
 *
 * Background is solid `bg-background` (the site's own warm off-white
 * token, not a translucent/blurred white) rather than the old
 * `bg-white/95 backdrop-blur` — a translucent/blurred bar would let
 * whatever's scrolling underneath show through inconsistently, which reads
 * less premium than one flat, deliberate surface color.
 *
 * The logo asset itself (`brand.assets.logo.light`, `public/brand/logo-light.png`)
 * was swapped to a genuinely transparent PNG (verified via its alpha
 * channel — the background pixels are alpha:0, not a baked-in solid fill
 * like the original opaque cream-backed lockup this project started with;
 * see brand.ts's asset doc comment for that history). No wrapping
 * background/rectangle is added around it here — it sits directly on the
 * header's own background color, which is the whole point of switching to
 * a transparent asset. `width`/`height` below are the file's true
 * intrinsic pixel dimensions (912×273), not an arbitrary display size —
 * combined with `h-8 w-auto md:h-11`, this is what keeps the aspect ratio
 * exact at every breakpoint instead of stretching.
 */
export function Header() {
  return (
    <MobileNavProvider>
      <header className="sticky top-0 z-40 border-b border-border bg-background shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <Container>
          <div className="flex h-16 items-center gap-3 md:h-20 md:gap-4 lg:gap-6">
            <MobileMenuTrigger className="lg:hidden" />

            <Link href="/" aria-label={`${brand.name} home`} className="shrink-0">
              <Image src={brand.assets.logo.light} alt={brand.name} width={912} height={273} priority className="h-8 w-auto md:h-11" />
            </Link>

            <div className="hidden min-w-0 flex-1 md:block md:max-w-xl lg:max-w-2xl">
              <SearchBar className="[&_[data-slot=search-field-group]]:h-11 [&_[data-slot=search-field-group]]:rounded-full [&_[data-slot=search-field-group]]:border-border [&_[data-slot=search-field-group]]:bg-surface-soft [&_[data-slot=search-field-group]]:shadow-none" />
            </div>

            <nav aria-label="Main" className="hidden shrink-0 lg:block">
              <NavLinks />
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
              <MobileSearchTrigger className="md:hidden" />
              <IconLinkButton href="/wishlist" aria-label="Wishlist" className="relative">
                <IconHeart className="size-5" />
                <WishlistCountBadge />
              </IconLinkButton>
              <div className="hidden lg:inline-flex">
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
