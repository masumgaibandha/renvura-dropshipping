"use client";

import { Button } from "@heroui/react";

import { IconHeart } from "@/components/ui/icons";
import { useWishlist } from "@/contexts/WishlistContext";

interface WishlistToggleButtonProps {
  slug: string;
  title: string;
  className?: string;
}

/**
 * No price/stock gate — unlike the cart, saving something for later is
 * meaningful regardless of whether it's currently priced or in stock.
 */
export function WishlistToggleButton({ slug, title, className }: WishlistToggleButtonProps) {
  const { isWishlisted, toggle } = useWishlist();
  const active = isWishlisted(slug);

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      aria-label={active ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
      aria-pressed={active}
      onPress={() => toggle(slug)}
      className={className}
    >
      <IconHeart className="size-4" fill={active ? "currentColor" : "none"} />
    </Button>
  );
}
