"use client";

import Link from "next/link";

import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import { useWishlist } from "@/contexts/WishlistContext";
import type { PublicProduct } from "@/types/product";

interface WishlistGridProps {
  /** The full catalog, pre-sanitized server-side by the wishlist page (see `toPublicProduct`) — this component only filters it by the client-only wishlist slugs. */
  products: PublicProduct[];
}

/**
 * Client Component: the saved-product slugs only exist in localStorage, so
 * filtering has to happen here. `products` arrives already sanitized from
 * the Server Component page — it must never be the full catalog fetched
 * directly in client code, since that would ship `wholesalePrice` for
 * every product to the browser (see `PublicProduct`'s doc comment).
 */
export function WishlistGrid({ products }: WishlistGridProps) {
  const { slugs, isHydrated } = useWishlist();
  const wishlisted = products.filter((product) => slugs.includes(product.slug));

  if (!isHydrated) return null;

  if (wishlisted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-body text-foreground/70">Your wishlist is empty.</p>
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="mb-6 text-small text-foreground/70">
        {wishlisted.length} {wishlisted.length === 1 ? "product" : "products"}
      </p>
      <ProductGrid products={wishlisted} />
    </div>
  );
}
