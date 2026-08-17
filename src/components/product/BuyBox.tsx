"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { StockBadge } from "@/components/ecommerce/Badges";
import { Price } from "@/components/ecommerce/Price";
import { useCart } from "@/contexts/CartContext";
import { trackGaAddToCart, trackGaViewItem } from "@/lib/analytics/ga4-client";
import { trackMetaAddToCart, trackMetaViewContent } from "@/lib/analytics/meta-client";
import { productToAnalyticsItem } from "@/lib/analytics/mapping";
import type { PublicProduct } from "@/types/product";
import { QuantitySelector } from "./QuantitySelector";

interface BuyBoxProps {
  /** Must be `PublicProduct` (wholesalePrice stripped via `toPublicProduct`), not the full `Product` — this is a Client Component, see `PublicProduct`'s doc comment. */
  product: PublicProduct;
  categoryLabel?: string;
  className?: string;
}

/**
 * Product info + purchase controls. Only verified fields render — model/
 * SKU are each individually omitted when null, `shortDescription` only
 * shows if the source actually has one (the full `description` lives in
 * ProductDetails below, not duplicated here). `wholesalePrice` is never
 * read, and can't be — see `PublicProduct`. Client Component (as of Phase
 * 7) so the quantity selector and the Add to Cart/Buy Now buttons can share
 * one quantity value — disabled via the same real-state formula
 * ProductCard already uses.
 */
export function BuyBox({ product, categoryLabel, className }: BuyBoxProps) {
  const { pricing, inventory } = product;
  const canPurchase = product.status === "active" && pricing.sellingPrice !== null && inventory.status !== "out_of_stock";
  const metaParts = [product.model ? `Model: ${product.model}` : null, product.sku ? `SKU: ${product.sku}` : null].filter(
    (part): part is string => part !== null,
  );

  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const router = useRouter();
  const hasFiredViewContent = useRef(false);

  // Fires once per product-detail-page visit — never if there's no real selling price yet (see
  // `productToAnalyticsItem`'s "gracefully omit, never fabricate" contract), so e.g. the held-back
  // Skin1004 100ml never produces a misleading value-bearing event.
  useEffect(() => {
    if (hasFiredViewContent.current) return;
    const analyticsItem = productToAnalyticsItem(product);
    if (!analyticsItem) return;
    hasFiredViewContent.current = true;
    trackMetaViewContent({ item: analyticsItem });
    trackGaViewItem({ item: analyticsItem });
  }, [product]);

  function cartItem() {
    return {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.media.thumbnail ?? product.media.images[0] ?? null,
      sellingPrice: pricing.sellingPrice,
      maxQuantity: inventory.stock,
    };
  }

  function trackAddToCart() {
    const analyticsItem = productToAnalyticsItem(product, quantity);
    if (!analyticsItem) return;
    trackMetaAddToCart({ item: analyticsItem });
    trackGaAddToCart({ item: analyticsItem });
  }

  function handleAddToCart() {
    if (pricing.sellingPrice === null) return;
    addItem({ ...cartItem(), sellingPrice: pricing.sellingPrice }, quantity);
    trackAddToCart();
  }

  function handleBuyNow() {
    if (pricing.sellingPrice === null) return;
    addItem({ ...cartItem(), sellingPrice: pricing.sellingPrice }, quantity);
    trackAddToCart();
    router.push("/cart");
  }

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
        <QuantitySelector value={quantity} onChange={setQuantity} max={inventory.stock} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          isDisabled={!canPurchase}
          aria-label={`Add ${product.title} to cart`}
          onPress={handleAddToCart}
          className="h-13 rounded-full border-2 font-semibold"
        >
          Add to Cart
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isDisabled={!canPurchase}
          aria-label={`Buy ${product.title} now`}
          onPress={handleBuyNow}
          className="h-13 rounded-full font-semibold shadow-sm hover:shadow-md"
        >
          Buy Now
        </Button>
      </div>

      {canPurchase && (
        <p className="mt-3 text-xs text-foreground/60">Cash on Delivery available — pay when your order arrives.</p>
      )}
    </div>
  );
}
