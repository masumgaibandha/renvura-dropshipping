import { Button } from "@heroui/react";

import { Price } from "@/components/ecommerce/Price";
import { StockBadge } from "@/components/ecommerce/Badges";
import type { Product } from "@/types/product";
import { QuantitySelector } from "./QuantitySelector";

interface BuyBoxProps {
  product: Product;
  categoryLabel?: string;
  className?: string;
}

/**
 * Product info + purchase controls. Only verified fields render — model/
 * SKU are each individually omitted when null, `shortDescription` only
 * shows if the source actually has one (the full `description` lives in
 * ProductDetails below, not duplicated here). `wholesalePrice` is never
 * read. Add to Cart / Buy Now are UI foundations only — disabled via the
 * same real-state formula ProductCard already uses, no cart wired up yet.
 */
export function BuyBox({ product, categoryLabel, className }: BuyBoxProps) {
  const { pricing, inventory } = product;
  const canPurchase = pricing.sellingPrice !== null && inventory.status !== "out_of_stock";
  const metaParts = [product.model ? `Model: ${product.model}` : null, product.sku ? `SKU: ${product.sku}` : null].filter(
    (part): part is string => part !== null,
  );

  return (
    <div className={className}>
      {categoryLabel && <p className="text-label text-foreground/70 uppercase">{categoryLabel}</p>}

      <h1 className="text-h1 mt-1 text-foreground">{product.title}</h1>

      {metaParts.length > 0 && <p className="mt-2 text-small text-foreground/70">{metaParts.join(" · ")}</p>}

      <div className="mt-4 flex items-center gap-3">
        <Price sellingPrice={pricing.sellingPrice} regularPrice={pricing.regularPrice} size="lg" />
        <StockBadge status={inventory.status} />
      </div>

      {product.shortDescription && <p className="mt-4 max-w-prose text-body text-foreground/70">{product.shortDescription}</p>}

      <div className="mt-6 flex items-center gap-4">
        <QuantitySelector max={inventory.stock} />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" size="lg" fullWidth isDisabled={!canPurchase} aria-label={`Add ${product.title} to cart`}>
          Add to Cart
        </Button>
        <Button variant="primary" size="lg" fullWidth isDisabled={!canPurchase} aria-label={`Buy ${product.title} now`}>
          Buy Now
        </Button>
      </div>
    </div>
  );
}
