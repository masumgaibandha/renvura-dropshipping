import { Dropdown } from "@heroui/react";

import { IconChevronDown, IconGrid } from "@/components/ui/icons";
import { getAllCategories } from "@/services/products";
import { Container } from "./Container";
import { NavLinks } from "./NavLinks";

/**
 * Compact bordered row beneath the header — reference layout: a purple
 * "Browse All Categories" dropdown on the left, primary nav on the right.
 * Desktop only (`lg:` and up); mobile nav lives entirely in the existing
 * MobileNav drawer, unchanged. The dropdown lists Renvura's real top-level
 * categories (src/data/categories.ts) — a working menu, not decorative.
 */
export function SecondaryNav() {
  const categories = getAllCategories().filter((category) => !category.parentSlug);

  return (
    <div className="hidden border-b border-border bg-background lg:block">
      <Container className="flex h-12 items-center justify-between gap-6">
        <Dropdown.Root>
          <Dropdown.Trigger className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <IconGrid className="size-4" />
            Browse All Categories
            <IconChevronDown className="size-3.5" />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom start" className="min-w-56">
            <Dropdown.Menu aria-label="Categories">
              {categories.map((category) => (
                <Dropdown.Item key={category.id} href={`/${category.slug}`} textValue={category.name}>
                  {category.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        <nav aria-label="Main">
          <NavLinks />
        </nav>
      </Container>
    </div>
  );
}
