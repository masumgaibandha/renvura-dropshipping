import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";

import { getCategoryBySlug } from "@/services/products";
import type { Product } from "@/types/product";
import { SaleBadge, StockBadge } from "./Badges";
import { Price } from "./Price";

interface ProductCardProps {
  product: Product;
  className?: string;
}

/**
 * Compact storefront product tile — reference card anatomy: image, category
 * label, title, price row, single full-width Add to Cart button. Only
 * renders fields the product actually has — see docs/DESIGN-SYSTEM.md for
 * what's intentionally omitted (ratings, review counts, "Best Seller"/
 * "Trending" badges) until real data backs them. Add to Cart is disabled
 * until the product has a real `sellingPrice` — there's nothing fake to add
 * to a cart otherwise.
 */
export function ProductCard({ product, className }: ProductCardProps) {
  const { pricing, media, inventory } = product;
  const categoryLabel = getCategoryBySlug(product.subcategory ?? product.category)?.name;
  const image = media.thumbnail ?? media.images[0] ?? null;
  const canPurchase = pricing.sellingPrice !== null && inventory.status !== "out_of_stock";
  const productHref = `/products/${product.slug}`;

  const discountPercentage =
    pricing.sellingPrice !== null && pricing.regularPrice !== null && pricing.regularPrice > pricing.sellingPrice
      ? pricing.discountPercentage
      : null;

  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl border border-border bg-surface ${className ?? ""}`}>
      <div className="relative aspect-square bg-background-secondary">
        {image ? (
          <Link href={productHref} tabIndex={-1} aria-hidden="true" className="block size-full">
            <Image
              src={image}
              alt={product.title}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </Link>
        ) : (
          <div className="flex size-full items-center justify-center text-small text-foreground/70">No image</div>
        )}

        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          <SaleBadge discountPercentage={discountPercentage} />
          {inventory.status === "out_of_stock" && <StockBadge status="out_of_stock" />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {categoryLabel && <p className="text-label text-foreground/70 uppercase">{categoryLabel}</p>}

        <h3 className="text-small line-clamp-2 min-h-10 font-medium">
          <Link href={productHref} className="hover:text-accent">
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Price sellingPrice={pricing.sellingPrice} regularPrice={pricing.regularPrice} showDiscountBadge={false} />

          <Button variant="primary" size="sm" fullWidth isDisabled={!canPurchase} aria-label={`Add ${product.title} to cart`}>
            Add to Cart
          </Button>
        </div>
      </div>
    </article>
  );
}
