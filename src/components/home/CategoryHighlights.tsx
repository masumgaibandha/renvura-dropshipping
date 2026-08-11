import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/types/category";

interface CategoryHighlight {
  slug: string;
  image: string;
  imageAlt: string;
  description: string;
  ctaLabel: string;
}

/**
 * Hand-authored, generic marketing copy per category — describes what's
 * actually in the catalog, not invented specifics (counts, claims, offers).
 * Lives here rather than in src/data/categories.ts so Phase 2's data model
 * stays untouched; this is homepage UI copy, not product data.
 */
const highlights: Record<string, CategoryHighlight> = {
  "electronics-gadgets": {
    slug: "electronics-gadgets",
    image: "/products/electronics-gadgets/x699-turbo-fan/image-1.jpg",
    imageAlt: "Electronics & Gadgets category",
    description: "Practical electronics and gadgets for everyday use — from portable fans to phone and camera accessories.",
    ctaLabel: "Shop Electronics",
  },
  "health-beauty": {
    slug: "health-beauty",
    image: "/products/health-beauty/dark-spot-correcting-glow-serum/image-1.jpg",
    imageAlt: "Health & Beauty category",
    description: "Skincare and personal care essentials, from serums and sunscreen to everyday self-care.",
    ctaLabel: "Shop Health & Beauty",
  },
};

interface CategoryHighlightsProps {
  categories: Category[];
}

/**
 * Editorial 2-column category section (1-column on mobile) — real product
 * photography, one truthful sentence per category, a CTA to the real
 * category route. Only renders categories that have hand-authored copy
 * above, so this never silently shows a blank/fake card for a category
 * added later without matching copy.
 */
export function CategoryHighlights({ categories }: CategoryHighlightsProps) {
  const cards = categories
    .map((category) => {
      const highlight = highlights[category.slug];
      return highlight ? { category, highlight } : null;
    })
    .filter((card): card is { category: Category; highlight: CategoryHighlight } => card !== null);

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
              href={`/${category.slug}`}
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
