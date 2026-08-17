import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WishlistToggleButton } from "@/components/wishlist/WishlistToggleButton";
import type { PublicProduct } from "@/types/product";
import { SaleBadge, StockBadge } from "./Badges";
import { Price } from "./Price";

interface ProductCardProps {
  /** `PublicProduct` (never the full `Product`) — see its doc comment; a real `Product` is still accepted since it's structurally a superset. */
  product: PublicProduct;
  /**
   * Resolved by the caller, never looked up in here — this component is
   * rendered directly by several Client Components (`CategoryTabs`,
   * `FeaturedProductsRow`, `WishlistGrid`'s `ProductGrid`), so it must stay
   * free of any server-only import (as of Phase 10, `src/services/products.ts`
   * pulls in Mongoose/MongoDB, which cannot be bundled for the browser).
   */
  categoryLabel?: string;
  className?: string;
}

/**
 * Compact storefront product tile — reference card anatomy: image, category
 * label, title, price row, single full-width Add to Cart button. Only
 * renders fields the product actually has — see docs/DESIGN-SYSTEM.md for
 * what's intentionally omitted (ratings, review counts, "Best Seller"/
 * "Trending" badges) until real data backs them. Stays a Server Component —
 * `AddToCartButton`/`WishlistToggleButton` are the only client surfaces
 * (Phase 7). Add to Cart is disabled until the product has a real
 * `sellingPrice` — there's nothing real to add to a cart otherwise; the
 * wishlist toggle has no such gate (saving something for later doesn't
 * require a price).
 */
export function ProductCard({ product, categoryLabel, className }: ProductCardProps) {
  const { pricing, media, inventory } = product;
  const image = media.thumbnail ?? media.images[0] ?? null;
  const canPurchase = product.status === "active" && pricing.sellingPrice !== null && inventory.status !== "out_of_stock";
  const productHref = `/products/${product.slug}`;

  const discountPercentage =
    pricing.sellingPrice !== null && pricing.regularPrice !== null && pricing.regularPrice > pricing.sellingPrice
      ? pricing.discountPercentage
      : null;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow duration-300 hover:shadow-card-hover ${className ?? ""}`}
    >
      <div className="relative aspect-square bg-surface-soft">
        {image ? (
          <Link href={productHref} tabIndex={-1} aria-hidden="true" className="block size-full">
            <Image
              src={image}
              alt={product.title}
              fill
              sizes="(min-width: 1280px) 23vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </Link>
        ) : (
          <div className="flex size-full items-center justify-center text-small text-foreground/70">No image</div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5 md:top-3 md:left-3">
          <SaleBadge discountPercentage={discountPercentage} />
          {inventory.status === "out_of_stock" && <StockBadge status="out_of_stock" />}
        </div>

        <WishlistToggleButton
          slug={product.slug}
          title={product.title}
          price={pricing.sellingPrice}
          category={product.subcategory ?? product.category}
          className="absolute top-2.5 right-2.5 size-9 bg-surface/90 text-foreground/70 shadow-sm backdrop-blur hover:text-accent md:top-3 md:right-3"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 md:gap-2 md:p-4">
        {categoryLabel && <p className="text-label text-accent/80 uppercase">{categoryLabel}</p>}

        <h3 className="line-clamp-2 min-h-9 text-small leading-snug font-medium text-foreground md:min-h-11 md:text-base">
          <Link href={productHref} className="hover:text-accent">
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto flex flex-col gap-2 pt-1 md:gap-3 md:pt-1.5">
          <Price sellingPrice={pricing.sellingPrice} regularPrice={pricing.regularPrice} size="sm" showDiscountBadge={false} />

          <AddToCartButton
            item={{
              productId: product.id,
              slug: product.slug,
              title: product.title,
              image,
              sellingPrice: pricing.sellingPrice,
              maxQuantity: inventory.stock,
            }}
            disabled={!canPurchase}
            label="Add to Cart"
            ariaLabel={`Add ${product.title} to cart`}
            className="text-small font-semibold md:text-base"
          />
        </div>
      </div>
    </article>
  );
}
