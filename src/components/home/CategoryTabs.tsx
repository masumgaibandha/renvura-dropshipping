"use client";

import { Tabs } from "@heroui/react";

import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

interface CategoryTabsProps {
  products: Product[];
  categories: Category[];
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
export function CategoryTabs({ products, categories }: CategoryTabsProps) {
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
        <ProductGrid products={products} />
      </Tabs.Panel>
      {categories.map((category) => (
        <Tabs.Panel key={category.id} id={category.slug}>
          <ProductGrid products={products.filter((product) => product.category === category.slug)} />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
