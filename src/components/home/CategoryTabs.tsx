"use client";

import { Tabs } from "@heroui/react";
import Link from "next/link";

import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import type { Category } from "@/types/category";
import type { PublicProduct } from "@/types/product";

// HeroUI's default variant renders the selected pill via a separate <Tabs.Indicator> tracked
// against a <Tabs.ListContainer> this component doesn't compose (see the CategoryTabs doc
// comment) — styling `data-selected` directly here is simpler and doesn't depend on that
// wiring being correct.
const tabClass =
  "w-auto shrink-0 whitespace-nowrap rounded-full border border-border px-5 py-2 text-small font-medium transition-colors data-[selected=true]:border-accent data-[selected=true]:bg-accent data-[selected=true]:text-white data-[selected=true]:shadow-sm";

interface CategoryTabsProps {
  /** Must be `PublicProduct` (wholesalePrice stripped) — this is a Client Component, see `PublicProduct`'s doc comment. */
  products: PublicProduct[];
  categories: Category[];
  /** slug -> display name, built server-side — see `ProductCard`'s `categoryLabel` doc comment. */
  categoryLabels?: Record<string, string>;
}

/**
 * "Popular Products" section — reference layout: title left, category tabs
 * right, on one row, filtering the grid below. Title lives here (not in a
 * separate SectionHeading) because HeroUI's Tabs.Root has to wrap both the
 * tab list and the tab panels, so the title/tabs row and the panels below
 * it are necessarily one component. Filtering happens in memory over the
 * already-fetched product list (passed down once from the Server Component
 * homepage) — no new data fetching or route change per tab.
 */
export function CategoryTabs({ products, categories, categoryLabels }: CategoryTabsProps) {
  return (
    <Tabs.Root defaultSelectedKey="all">
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-h2 text-foreground">Popular Products</h2>
        {/*
          IMPORTANT — two distinct HeroUI base-style overrides are needed here, found by root-
          cause DOM auditing (an injected same-origin iframe at real narrow widths, since this
          environment's window-resize tooling doesn't affect actual rendering — see the redesign
          notes):

          1. `.tabs__tab` sets `width: 100%` on every tab — its equal-width-segmented-tabs trick
             relies on flex's default shrink behavior in a *non-wrapping* row (every tab requests
             100%, the row shrinks them down proportionally to fit). `flex-wrap` breaks that
             trick: once wrapping is allowed, the browser stops shrinking and instead drops each
             100%-wide tab onto its own line — a vertical stack of full-width pills instead of a
             horizontal row. Never add `flex-wrap` back here.

          2. `.tabs__list[data-orientation="horizontal"]` sets `width: max-content` — an explicit
             (non-`auto`) width, which defeats this row's own `align-items: stretch` from its
             `flex-col` parent (a flex item's specified width always wins over stretch). At
             narrow/mobile widths the row was sizing to fit *all* tabs at once (~1400px for 9
             categories) instead of respecting the ~350px viewport, blowing out
             `document.documentElement.scrollWidth` for the *entire page* — not just this row —
             which is what made the whole homepage appear zoomed out to a narrow left column with
             a huge blank area on the right in real narrow-viewport screenshots. `w-full min-w-0`
             overrides that explicit width so the row actually respects its container, and
             `overflow-x-auto` (no wrap) then correctly scrolls *internally* for a category list
             too long to fit, instead of the page overflowing.
        */}
        <Tabs.List
          aria-label="Filter popular products by category"
          className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Tabs.Tab id="all" className={tabClass}>
            All
          </Tabs.Tab>
          {categories.map((category) => (
            <Tabs.Tab key={category.id} id={category.slug} className={tabClass}>
              {category.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>

      <Tabs.Panel id="all">
        <ProductGrid products={products} categoryLabels={categoryLabels} mobileCarousel />
      </Tabs.Panel>
      {categories.map((category) => {
        const categoryProducts = products.filter((product) => product.category === category.slug);
        return (
          <Tabs.Panel key={category.id} id={category.slug}>
            {categoryProducts.length > 0 ? (
              <ProductGrid products={categoryProducts} categoryLabels={categoryLabels} mobileCarousel />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-small text-foreground/70">No {category.name} picks featured here yet.</p>
                <Link
                  href={`/shop?category=${category.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-small font-medium text-foreground transition-colors hover:border-accent"
                >
                  Browse {category.name}
                </Link>
              </div>
            )}
          </Tabs.Panel>
        );
      })}
    </Tabs.Root>
  );
}
