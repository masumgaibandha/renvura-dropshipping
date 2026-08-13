"use client";

import { Button } from "@heroui/react";

import { IconHeart } from "@/components/ui/icons";
import { useWishlist } from "@/contexts/WishlistContext";
import { trackGaAddToWishlist } from "@/lib/analytics/ga4-client";
import { trackMetaAddToWishlist } from "@/lib/analytics/meta-client";

interface WishlistToggleButtonProps {
  slug: string;
  title: string;
  /** Optional — only passed by callers that already have the product's real selling price (`ProductCard`, `BuyBox`). When absent, the AddToWishlist event still fires but without a `value`, never a fabricated price. */
  price?: number | null;
  category?: string | null;
  className?: string;
}

/**
 * No price/stock gate — unlike the cart, saving something for later is
 * meaningful regardless of whether it's currently priced or in stock.
 */
export function WishlistToggleButton({ slug, title, price, category, className }: WishlistToggleButtonProps) {
  const { isWishlisted, toggle } = useWishlist();
  const active = isWishlisted(slug);

  function handlePress() {
    const wasWishlisted = active;
    toggle(slug);
    if (wasWishlisted) return; // only track the add, never the remove
    const analyticsItem = { id: slug, name: title, category: category ?? undefined, price: price ?? 0, quantity: 1 };
    trackMetaAddToWishlist({ item: analyticsItem });
    trackGaAddToWishlist({ item: analyticsItem });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      aria-label={active ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
      aria-pressed={active}
      onPress={handlePress}
      className={className}
    >
      <IconHeart className="size-4" fill={active ? "currentColor" : "none"} />
    </Button>
  );
}
