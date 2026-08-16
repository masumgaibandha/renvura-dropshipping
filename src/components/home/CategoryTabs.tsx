"use client";

import { Tabs } from "@heroui/react";
import Link from "next/link";

import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import type { Category } from "@/types/category";
import type { PublicProduct } from "@/types/product";

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-h2">Popular Products</h2>
        <Tabs.List aria-label="Filter popular products by category" className="flex flex-wrap gap-1">
          <Tabs.Tab id="all" className="rounded-full px-4 py-1.5 text-small font-medium">
            All
          </Tabs.Tab>
          {categories.map((category) => (
            <Tabs.Tab key={category.id} id={category.slug} className="rounded-full px-4 py-1.5 text-small font-medium">
              {category.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>

      <Tabs.Panel id="all">
        <ProductGrid products={products} categoryLabels={categoryLabels} />
      </Tabs.Panel>
      {categories.map((category) => {
        const categoryProducts = products.filter((product) => product.category === category.slug);
        return (
          <Tabs.Panel key={category.id} id={category.slug}>
            {categoryProducts.length > 0 ? (
              <ProductGrid products={categoryProducts} categoryLabels={categoryLabels} />
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
