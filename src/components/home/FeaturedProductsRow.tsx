"use client";

import Link from "next/link";
import { useRef } from "react";

import { ProductCard } from "@/components/ecommerce/ProductCard";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";
import type { Category } from "@/types/category";
import type { PublicProduct } from "@/types/product";

interface FeaturedProductsRowProps {
  /** Must be `PublicProduct` (wholesalePrice stripped) — this is a Client Component, see `PublicProduct`'s doc comment. */
  products: PublicProduct[];
  promoCategory: Category;
  /** slug -> display name, built server-side — see `ProductCard`'s `categoryLabel` doc comment. */
  categoryLabels?: Record<string, string>;
}

/**
 * "Featured Picks" — reference layout: heading + prev/next controls on one
 * row, then a horizontally-scrollable strip starting with a promotional
 * category tile. Named "Featured Picks" rather than "Best Sellers"/"Daily
 * Best Sells": no sales-ranking data exists to support a best-seller claim.
 */
export function FeaturedProductsRow({ products, promoCategory, categoryLabels }: FeaturedProductsRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-h2">Featured Picks</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:text-accent"
          >
            <IconArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:text-accent"
          >
            <IconArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="flex items-stretch gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href={`/${promoCategory.slug}`}
          className="flex w-56 shrink-0 flex-col justify-end rounded-2xl border border-border bg-surface-warm p-5 text-foreground shadow-card transition-colors hover:border-accent sm:w-64"
        >
          <span className="text-label text-accent uppercase">Shop the category</span>
          <span className="text-h3 mt-1">{promoCategory.name}</span>
        </Link>

        {products.map((product) => (
          <div key={product.id} className="w-44 shrink-0 sm:w-52">
            <ProductCard product={product} categoryLabel={categoryLabels?.[product.subcategory ?? product.category]} />
          </div>
        ))}
      </div>
    </div>
  );
}
