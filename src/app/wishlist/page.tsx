"use client";

import Link from "next/link";

import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { useWishlist } from "@/contexts/WishlistContext";
import { getAllProducts } from "@/services/products";

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Wishlist" }];

/**
 * Client Component — the saved-product slugs only exist in localStorage,
 * so this page reads getAllProducts() (already synchronous/local) and
 * filters by the wishlist context's slugs. Unlike the cart (which stores
 * its own display fields), the wishlist deliberately stores slugs only,
 * so this is the one place a full product-data import into client code is
 * an accepted tradeoff — it's a dedicated, code-split route, not something
 * loaded on every page the way header chrome is.
 */
export default function WishlistPage() {
  const { slugs, isHydrated } = useWishlist();
  const products = getAllProducts().filter((product) => slugs.includes(product.slug));

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Wishlist</h1>

      {!isHydrated ? null : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-body text-foreground/70">Your wishlist is empty.</p>
          <Link
            href="/shop"
            className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-6 text-small text-foreground/70">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
          <ProductGrid products={products} />
        </div>
      )}
    </Container>
  );
}
