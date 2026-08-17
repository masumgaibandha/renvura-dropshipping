import { Dropdown } from "@heroui/react";

import { IconChevronDown, IconGrid } from "@/components/ui/icons";
import { getAllCategories } from "@/services/products";
import { Container } from "./Container";
import { NavLinks } from "./NavLinks";

/**
 * Compact bordered row beneath the header — reference layout: a navy
 * "Browse All Categories" dropdown on the left (retextured off indigo in
 * the Phase 24 redesign — see globals.css), primary nav on the right.
 * Desktop only (`lg:` and up); mobile nav lives entirely in the existing
 * MobileNav drawer, unchanged. The dropdown lists Renvura's real top-level
 * categories (src/data/categories.ts) — a working menu, not decorative.
 *
 * The 1024–1150px range is tight: "Browse All Categories" + 4 nav items
 * (one of which is itself a dropdown) can start colliding right at the
 * `lg` breakpoint. The trigger label shortens to "Categories" until `xl`
 * and NavLinks' gap tightens at `lg` (see its own `className` prop) so
 * nothing wraps or overlaps in that narrow window.
 */
export async function SecondaryNav() {
  const allCategories = await getAllCategories();
  const categories = allCategories.filter((category) => !category.parentSlug && category.isActive);

  return (
    <div className="hidden border-b border-border bg-white lg:block">
      <Container className="flex h-12 items-center justify-between gap-4 xl:gap-6">
        <Dropdown.Root>
          <Dropdown.Trigger className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-accent px-3.5 text-small font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus xl:px-4">
            <IconGrid className="size-4" />
            <span className="hidden xl:inline">Browse All Categories</span>
            <span className="xl:hidden">Categories</span>
            <IconChevronDown className="size-3.5" />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom start" className="min-w-56">
            <Dropdown.Menu aria-label="Categories">
              {categories.map((category) => (
                <Dropdown.Item key={category.id} href={`/shop?category=${category.slug}`} textValue={category.name}>
                  {category.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        <nav aria-label="Main" className="min-w-0">
          <NavLinks />
        </nav>
      </Container>
    </div>
  );
}
