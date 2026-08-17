import { clsx } from "clsx";

import { ProductCard } from "./ProductCard";
import type { PublicProduct } from "@/types/product";

interface ProductGridProps {
  products: PublicProduct[];
  /** slug (category or subcategory) -> display name, built once by the caller — see `ProductCard`'s `categoryLabel` doc comment. */
  categoryLabels?: Record<string, string>;
  className?: string;
  /**
   * Mobile-only single-card horizontal carousel instead of a dense grid —
   * for curated/merchandising sections (homepage Popular Products, New
   * Arrivals, product-detail Related Products) where one large, readable
   * card beats a cramped 2-up grid at narrow widths. Reverts to the normal
   * responsive grid at `sm:` and up.
   *
   * `/shop`'s catalog-browsing grid deliberately never sets this — a
   * shopper scanning the full catalog wants density, not one card at a
   * time; only pass `mobileCarousel` from curated sections, never from
   * `ProductListingPage`.
   */
  mobileCarousel?: boolean;
}

/**
 * Shared responsive grid — 2 columns on mobile, 3 on tablet, 4 on desktop
 * (never squeezed to 5+), per the Phase 24 redesign's "larger product
 * presentation" direction. Gap widens alongside the larger cards so the
 * grid reads as spacious rather than cramped.
 */
export function ProductGrid({ products, categoryLabels, className, mobileCarousel = false }: ProductGridProps) {
  return (
    <div
      className={clsx(
        mobileCarousel
          ? // Mobile: edge-to-edge horizontal snap carousel, one large card at a time (the
            // negative margin cancels Container's own px-4 gutter so cards can bleed to the
            // screen edge with a deliberate peek of the next card — re-added as inner padding
            // so the first/last card never touches the edge). sm:+ reverts to a normal grid.
            "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 -mx-4 px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 [&::-webkit-scrollbar]:hidden"
          : "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6",
        className,
      )}
    >
      {products.map((product) => (
        <div
          key={product.id}
          className={mobileCarousel ? "w-[85vw] max-w-sm shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink" : undefined}
        >
          <ProductCard product={product} categoryLabel={categoryLabels?.[product.subcategory ?? product.category]} />
        </div>
      ))}
    </div>
  );
}
