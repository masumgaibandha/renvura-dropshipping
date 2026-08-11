import Image from "next/image";
import Link from "next/link";

import { SearchBar } from "@/components/ecommerce/SearchBar";
import { IconLinkButton } from "@/components/ui/IconLinkButton";
import { IconBag, IconHeart, IconUser } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import { Container } from "./Container";
import { MobileDrawer, MobileMenuTrigger, MobileNavProvider, MobileSearchTrigger } from "./MobileNav";

/**
 * Sticky site header. The search field is the dominant center element
 * (reference layout), with primary nav living one row down in
 * SecondaryNav.tsx. Mobile shows a hamburger + search trigger that open
 * the shared drawer in MobileNav.tsx. See docs/DESIGN-SYSTEM.md for the
 * header rules (logo variant choice, sticky behavior, icon set).
 */
export function Header() {
  return (
    <MobileNavProvider>
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <Container>
          <div className="flex h-16 items-center gap-3 md:h-18 md:gap-6">
            <MobileMenuTrigger className="lg:hidden" />

            <Link href="/" aria-label={`${brand.name} home`} className="shrink-0">
              <Image src={brand.assets.logo.light} alt={brand.name} width={150} height={45} priority className="h-8 w-auto md:h-10" />
            </Link>

            <div className="hidden flex-1 md:block md:max-w-2xl">
              <SearchBar />
            </div>

            <div className="ml-auto flex items-center gap-1 md:gap-2">
              <MobileSearchTrigger className="md:hidden" />
              <IconLinkButton href="/wishlist" aria-label="Wishlist" className="hidden md:inline-flex">
                <IconHeart className="size-5" />
              </IconLinkButton>
              <IconLinkButton href="/account" aria-label="Account" className="hidden md:inline-flex">
                <IconUser className="size-5" />
                <span className="text-small font-medium">Login</span>
              </IconLinkButton>
              <IconLinkButton href="/cart" aria-label="Cart">
                <IconBag className="size-5" />
                <span className="hidden text-small font-medium md:inline">Cart</span>
              </IconLinkButton>
            </div>
          </div>
        </Container>
      </header>

      <MobileDrawer />
    </MobileNavProvider>
  );
}
