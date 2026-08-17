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
        <div>
          <h2 className="text-h2 text-foreground">Featured Picks</h2>
          <p className="mt-1 text-small text-foreground/70">Hand-picked from across the catalog.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-accent hover:text-accent"
          >
            <IconArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-accent hover:text-accent"
          >
            <IconArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/*
        Mobile: one large card at a time (~85vw, matching ProductGrid's mobileCarousel width)
        bleeding to the screen edge (negative margin cancels Container's own px-4 gutter) so a
        deliberate peek of the next card shows past the viewport edge. sm:+ reverts to the
        original smaller multi-card strip.
      */}
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <Link
          href={`/shop?category=${promoCategory.slug}`}
          className="flex w-[85vw] max-w-sm shrink-0 snap-center flex-col justify-end rounded-2xl border border-border bg-surface-warm p-6 text-foreground shadow-card transition-colors hover:border-accent sm:w-60"
        >
          <span className="text-label text-accent uppercase">Shop the category</span>
          <span className="text-h3 mt-1.5">{promoCategory.name}</span>
        </Link>

        {products.map((product) => (
          <div key={product.id} className="w-[85vw] max-w-sm shrink-0 snap-center sm:w-60">
            <ProductCard product={product} categoryLabel={categoryLabels?.[product.subcategory ?? product.category]} />
          </div>
        ))}
      </div>
    </div>
  );
}
