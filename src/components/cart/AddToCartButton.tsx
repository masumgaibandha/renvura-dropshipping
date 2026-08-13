"use client";

import { Button } from "@heroui/react";

import { useCart } from "@/contexts/CartContext";
import { trackGaAddToCart } from "@/lib/analytics/ga4-client";
import { trackMetaAddToCart } from "@/lib/analytics/meta-client";
import type { AnalyticsItem } from "@/lib/analytics/event-types";
import type { CartItemInput } from "@/types/cart";

interface AddToCartButtonProps {
  item: Omit<CartItemInput, "sellingPrice"> & { sellingPrice: number | null };
  disabled: boolean;
  quantity?: number;
  label: string;
  ariaLabel: string;
  className?: string;
}

/**
 * The only new client surface ProductCard gains — everything else about
 * the card stays server-rendered. `disabled` is the same real-state
 * formula ProductCard already computes (`sellingPrice !== null &&
 * status !== "out_of_stock"`); this component doesn't recompute it, just
 * respects it and additionally never calls `addItem` when `sellingPrice`
 * is null, so there's no path to an invalid cart line even if a caller
 * gets the `disabled` flag wrong.
 */
export function AddToCartButton({ item, disabled, quantity = 1, label, ariaLabel, className }: AddToCartButtonProps) {
  const { addItem } = useCart();

  function handleAdd() {
    if (item.sellingPrice === null) return;
    addItem({ ...item, sellingPrice: item.sellingPrice }, quantity);

    const analyticsItem: AnalyticsItem = { id: item.slug, name: item.title, price: item.sellingPrice, quantity };
    trackMetaAddToCart({ item: analyticsItem });
    trackGaAddToCart({ item: analyticsItem });
  }

  return (
    <Button variant="primary" size="sm" fullWidth isDisabled={disabled} className={className} aria-label={ariaLabel} onPress={handleAdd}>
      {label}
    </Button>
  );
}
