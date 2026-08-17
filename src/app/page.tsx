import type { Metadata } from "next";
import Link from "next/link";

import { BrandStory } from "@/components/home/BrandStory";
import { CategoryHighlights } from "@/components/home/CategoryHighlights";
import { CategoryTabs } from "@/components/home/CategoryTabs";
import { FeaturedProductsRow } from "@/components/home/FeaturedProductsRow";
import { HeroSlider } from "@/components/home/HeroSlider";
import { HeroTrustStrip } from "@/components/home/HeroTrustStrip";
import { NewArrivals } from "@/components/home/NewArrivals";
import { PromoBanner } from "@/components/home/PromoBanner";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { WhyShopWithRenvura } from "@/components/home/WhyShopWithRenvura";
import { Section } from "@/components/layout/Section";
import { brand } from "@/config/brand";
import { getAllCategories, getAllProducts, toPublicProduct } from "@/services/products";

/**
 * Overrides the root layout's generic title/description for `/` specifically.
 * `title.absolute` bypasses the layout's "%s | Renvura" template so this
 * doesn't become "...| Renvura" twice.
 */
export const metadata: Metadata = {
  title: { absolute: "Renvura — Online Shopping in Bangladesh" },
  description: "Shop electronics, fashion, home & lifestyle, health & beauty, and more in Bangladesh, with Cash on Delivery available nationwide.",
};

/**
 * ISR, not fully static: as of Phase 10 this page reads the MongoDB-backed
 * catalog (featured products, categories), which admin can edit at any
 * time. Admin product/category/homepage mutations also call
 * `revalidatePath("/")` for near-instant updates; this 60s ceiling is the
 * fallback so the homepage never goes stale even if a revalidation call is
 * ever missed.
 */
export const revalidate = 60;

/**
 * Homepage — reference section order: hero, Popular Products (tabs + grid),
 * View All Products, Featured Picks (promo tile + carousel), Category
 * Highlights, Why Shop With Renvura, Our Story. Server Component: fetches
 * the Phase 2 seed catalog once and passes it down; no client-side
 * fetching. Still no cart/checkout/auth/DB — Phase 4 scope only. See
 * docs/DESIGN-SYSTEM.md and docs/PRODUCT-ROADMAP.md.
 */
export default async function Home() {
  const [allProducts, allCategories] = await Promise.all([getAllProducts(), getAllCategories()]);
  const topCategories = allCategories.filter((category) => !category.parentSlug && category.isActive);

  // CategoryTabs/FeaturedProductsRow are Client Components — sanitize before crossing that boundary.
  // "Popular Products" is sampled per top-level category (not a flat first-N slice) so every
  // category tab has real content — a flat slice would only ever surface whichever categories
  // happen to sort first in the DB, silently starving every category added after the original
  // catalog (see CLAUDE.md's category-navigation note). "Featured Picks" is admin-curated via
  // /admin/homepage (Phase 10) — falls back to the next products in line so the section never sits
  // empty before an admin has picked anything.
  const PRODUCTS_PER_CATEGORY_HOMEPAGE = 4;
  const activeProducts = allProducts.filter((product) => product.status === "active");
  const popularProductsSource = topCategories.flatMap((category) =>
    activeProducts.filter((product) => product.category === category.slug).slice(0, PRODUCTS_PER_CATEGORY_HOMEPAGE),
  );
  const popularProducts = popularProductsSource.map(toPublicProduct);
  const featuredSource = activeProducts.filter((product) => product.featured);
  const featuredProducts = (featuredSource.length > 0 ? featuredSource : activeProducts.slice(10, 18)).map(toPublicProduct);
  const promoCategory = allCategories.find((category) => category.slug === "health-beauty") ?? topCategories[0];
  const categoryLabels = Object.fromEntries(allCategories.map((category) => [category.slug, category.name]));

  // "New Arrivals" — genuinely sorted by the real `createdAt` timestamp (see NewArrivals.tsx's doc
  // comment), never a fabricated "new" flag. Excludes whatever's already shown in Featured Picks
  // immediately above it so the two sections don't just repeat each other.
  const NEW_ARRIVALS_COUNT = 10;
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  const newArrivalsSource = activeProducts
    .filter((product) => product.createdAt && !featuredIds.has(product.id))
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, NEW_ARRIVALS_COUNT);
  const newArrivals = newArrivalsSource.map(toPublicProduct);

  return (
    <>
      {/* The hero slider's own slide headlines are real DOM text (see HeroSlider.tsx), but they're
          promotional per-category copy, not a statement of what the page/site itself is — this
          sr-only heading is still the one genuine page-level <h1> landmark for
          screen-readers/SEO. Rendered outside `Section`/`Container` on purpose: the hero is
          deliberately full-bleed (100vw, no rounded "card" corners, no vertical padding above
          it) so it starts immediately under the navbar with no gap and no side gutters — see
          HeroSlider.tsx's own doc comment. */}
      <h1 className="sr-only">{brand.name} — Online Shopping in Bangladesh</h1>
      <HeroSlider />

      <Section className="py-6 sm:py-8">
        <HeroTrustStrip />
      </Section>

      {topCategories.length > 0 && (
        <Section className="pt-0!">
          <ShopByCategory categories={topCategories} products={popularProducts} />
        </Section>
      )}

      <Section className="bg-background-secondary">
        <CategoryTabs products={popularProducts} categories={topCategories} categoryLabels={categoryLabels} />
        <div className="mt-10 text-center">
          <Link
            href="/shop"
            className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-small font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            View All Products
          </Link>
        </div>
      </Section>

      <Section className="py-6 sm:py-8">
        <PromoBanner />
      </Section>

      {promoCategory && featuredProducts.length > 0 && (
        <Section>
          <FeaturedProductsRow products={featuredProducts} promoCategory={promoCategory} categoryLabels={categoryLabels} />
        </Section>
      )}

      {newArrivals.length > 0 && (
        <Section className="bg-background-secondary">
          <NewArrivals products={newArrivals} categoryLabels={categoryLabels} />
        </Section>
      )}

      <Section>
        <div className="mb-8 text-center">
          <h2 className="text-h2 text-foreground">Explore Our Categories</h2>
        </div>
        <CategoryHighlights categories={topCategories} products={popularProducts} />
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
