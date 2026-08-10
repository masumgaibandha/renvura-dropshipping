import Image from "next/image";
import Link from "next/link";

import { SearchBar } from "@/components/ecommerce/SearchBar";
import { IconLinkButton } from "@/components/ui/IconLinkButton";
import { IconBag, IconHeart, IconUser } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import { Container } from "./Container";
import { MobileDrawer, MobileMenuTrigger, MobileNavProvider, MobileSearchTrigger } from "./MobileNav";
import { NavLinks } from "./NavLinks";

/**
 * Sticky site header. Desktop shows the full nav + inline search; mobile
 * shows a hamburger + search trigger that open the shared drawer in
 * MobileNav.tsx. See docs/DESIGN-SYSTEM.md for the header rules (logo
 * variant choice, sticky behavior, icon set).
 */
export function Header() {
  return (
    <MobileNavProvider>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Container>
          <div className="flex h-16 items-center gap-3 md:h-20 md:gap-6">
            <MobileMenuTrigger className="lg:hidden" />

            <Link href="/" aria-label={`${brand.name} home`} className="shrink-0">
              <Image src={brand.assets.logo.light} alt={brand.name} width={150} height={45} priority className="h-9 w-auto md:h-11" />
            </Link>

            <nav aria-label="Main" className="hidden lg:block">
              <NavLinks />
            </nav>

            <div className="hidden flex-1 md:block md:max-w-xs lg:max-w-sm">
              <SearchBar />
            </div>

            <div className="ml-auto flex items-center gap-0.5 md:gap-1">
              <MobileSearchTrigger className="md:hidden" />
              <IconLinkButton href="/wishlist" aria-label="Wishlist" className="hidden md:inline-flex">
                <IconHeart className="size-5" />
              </IconLinkButton>
              <IconLinkButton href="/account" aria-label="Account" className="hidden md:inline-flex">
                <IconUser className="size-5" />
              </IconLinkButton>
              <IconLinkButton href="/cart" aria-label="Cart">
                <IconBag className="size-5" />
              </IconLinkButton>
            </div>
          </div>
        </Container>
      </header>

      <MobileDrawer />
    </MobileNavProvider>
  );
}
