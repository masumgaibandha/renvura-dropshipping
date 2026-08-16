import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/types/category";
import type { PublicProduct } from "@/types/product";

interface CategoryHighlight {
  image: string;
  imageAlt: string;
  description: string;
  ctaLabel: string;
}

/**
 * Hand-authored, generic marketing copy for the two original categories —
 * describes what's actually in the catalog, not invented specifics (counts,
 * claims, offers). Lives here rather than in src/data/categories.ts so
 * Phase 2's data model stays untouched; this is homepage UI copy, not
 * product data. Extend this only when a category's copy is worth writing by
 * hand — every other active category falls through to the scalable
 * `genericHighlight()` fallback below rather than being silently omitted.
 */
const highlights: Record<string, Omit<CategoryHighlight, "image" | "imageAlt">> = {
  "electronics-gadgets": {
    description: "Practical electronics and gadgets for everyday use — from portable fans to phone and camera accessories.",
    ctaLabel: "Shop Electronics",
  },
  "health-beauty": {
    description: "Skincare and personal care essentials, from serums and sunscreen to everyday self-care.",
    ctaLabel: "Shop Health & Beauty",
  },
};

/** A category's own real product photo, used both for the two hand-authored cards above and as the fallback image for every other category — never a stock/placeholder image. */
function representativeImage(category: Category, products: PublicProduct[]): string | null {
  const match = products.find(
    (product) => (product.category === category.slug || product.subcategory === category.slug) && product.media.images.length > 0,
  );
  return match ? match.media.images[0] : null;
}

/** Generic, truthful, non-fabricated copy for a category with no hand-authored highlight — states only what's structurally true (it's a real category with real products), never a specific claim about assortment size or quality. */
function genericHighlight(category: Category): Omit<CategoryHighlight, "image" | "imageAlt"> {
  return {
    description: `Browse the ${category.name} collection — delivered across Bangladesh with Cash on Delivery.`,
    ctaLabel: `Shop ${category.name}`,
  };
}

interface CategoryHighlightsProps {
  categories: Category[];
  /** Used only to derive each card's representative photo (`representativeImage`) — never rendered as price/stock data, so `PublicProduct` (wholesalePrice-stripped) is deliberately what this accepts, matching every other home component that crosses into product data. */
  products: PublicProduct[];
}

/**
 * Editorial category discovery grid (2-column desktop, 1-column mobile) —
 * real product photography, one truthful sentence per category, a CTA to
 * `/shop?category=<slug>` (the one route confirmed to resolve for every
 * category and subcategory — see CLAUDE.md's category-navigation note).
 * Every active top-level category renders a card: hand-authored copy where
 * it exists, `genericHighlight()` otherwise — a category is never silently
 * dropped just because nobody has written marketing copy for it yet. A
 * category with literally no product photo anywhere (no active products)
 * is the one case still skipped, since there is no real image to show and
 * no products to send a customer to.
 */
export function CategoryHighlights({ categories, products }: CategoryHighlightsProps) {
  const cards = categories
    .map((category) => {
      const image = representativeImage(category, products);
      if (!image) return null;
      const copy = highlights[category.slug] ?? genericHighlight(category);
      return { category, highlight: { ...copy, image, imageAlt: `${category.name} category` } };
    })
    .filter((card): card is { category: Category; highlight: CategoryHighlight } => card !== null);

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {cards.map(({ category, highlight }) => (
        <div key={category.slug} className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="relative aspect-[16/10]">
            <Image
              src={highlight.image}
              alt={highlight.imageAlt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
          <div className="p-6">
            <h3 className="text-h3 text-foreground">{category.name}</h3>
            <p className="mt-2 text-small text-foreground/70">{highlight.description}</p>
            <Link
              href={`/shop?category=${category.slug}`}
              className="mt-4 inline-flex h-10 items-center rounded-full bg-accent px-5 text-small font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {highlight.ctaLabel}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
