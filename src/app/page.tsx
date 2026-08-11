import type { Metadata } from "next";
import Link from "next/link";

import { BrandStory } from "@/components/home/BrandStory";
import { CategoryHighlights } from "@/components/home/CategoryHighlights";
import { CategoryTabs } from "@/components/home/CategoryTabs";
import { FeaturedProductsRow } from "@/components/home/FeaturedProductsRow";
import { HeroBanner } from "@/components/home/HeroBanner";
import { WhyShopWithRenvura } from "@/components/home/WhyShopWithRenvura";
import { Section } from "@/components/layout/Section";
import { getAllCategories, getAllProducts, getCategoryBySlug, toPublicProduct } from "@/services/products";

/**
 * Overrides the root layout's generic title/description for `/` specifically.
 * `title.absolute` bypasses the layout's "%s | Renvura" template so this
 * doesn't become "...| Renvura" twice.
 */
export const metadata: Metadata = {
  title: { absolute: "Renvura — Gadgets, Electronics & Health and Beauty in Bangladesh" },
  description: "Shop electronics, gadgets, and health & beauty essentials in Bangladesh, with Cash on Delivery available nationwide.",
};

/**
 * Homepage — reference section order: hero, Popular Products (tabs + grid),
 * View All Products, Featured Picks (promo tile + carousel), Category
 * Highlights, Why Shop With Renvura, Our Story. Server Component: fetches
 * the Phase 2 seed catalog once and passes it down; no client-side
 * fetching. Still no cart/checkout/auth/DB — Phase 4 scope only. See
 * docs/DESIGN-SYSTEM.md and docs/PRODUCT-ROADMAP.md.
 */
export default function Home() {
  const allProducts = getAllProducts();
  const topCategories = getAllCategories().filter((category) => !category.parentSlug);

  // CategoryTabs/FeaturedProductsRow are Client Components — sanitize before crossing that boundary.
  const popularProducts = allProducts.slice(0, 10).map(toPublicProduct);
  const featuredProducts = allProducts.slice(10, 18).map(toPublicProduct);
  const promoCategory = getCategoryBySlug("health-beauty") ?? topCategories[0];

  return (
    <>
      <Section className="pb-0!">
        <HeroBanner />
      </Section>

      <Section>
        <CategoryTabs products={popularProducts} categories={topCategories} />
        <div className="mt-10 text-center">
          <Link
            href="/shop"
            className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            View All Products
          </Link>
        </div>
      </Section>

      {promoCategory && featuredProducts.length > 0 && (
        <Section className="bg-background-secondary">
          <FeaturedProductsRow products={featuredProducts} promoCategory={promoCategory} />
        </Section>
      )}

      <Section>
        <CategoryHighlights categories={topCategories} />
      </Section>

      <Section className="bg-background-secondary">
        <WhyShopWithRenvura />
      </Section>

      <Section>
        <BrandStory />
      </Section>
    </>
  );
}
