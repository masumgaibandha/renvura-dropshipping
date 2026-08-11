import Link from "next/link";

import { BrandStory } from "@/components/home/BrandStory";
import { CategoryTabs } from "@/components/home/CategoryTabs";
import { FeaturedProductsRow } from "@/components/home/FeaturedProductsRow";
import { HeroBanner } from "@/components/home/HeroBanner";
import { Section } from "@/components/layout/Section";
import { getAllCategories, getAllProducts, getCategoryBySlug } from "@/services/products";

/**
 * Homepage — reference section order: hero, Popular Products (tabs + grid),
 * View All Products, Featured Picks (promo tile + carousel), Our Story.
 * Server Component: fetches the Phase 2 seed catalog once and passes it
 * down; no client-side fetching. Still no cart/checkout/auth/DB — Phase 3
 * redesign scope only. See docs/DESIGN-SYSTEM.md and docs/PRODUCT-ROADMAP.md.
 */
export default function Home() {
  const allProducts = getAllProducts();
  const topCategories = getAllCategories().filter((category) => !category.parentSlug);

  const popularProducts = allProducts.slice(0, 10);
  const featuredProducts = allProducts.slice(10, 18);
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
        <BrandStory />
      </Section>
    </>
  );
}
