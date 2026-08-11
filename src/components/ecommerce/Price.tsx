import { clsx } from "clsx";

import { formatBDT } from "@/utils/currency";
import { calculateDiscountPercentage } from "@/utils/pricing";
import { SaleBadge } from "./Badges";

interface PriceProps {
  /** Customer-facing price. `null` means the business hasn't priced this product yet. */
  sellingPrice: number | null;
  /** Pre-discount price, shown struck through only when it's genuinely higher. */
  regularPrice?: number | null;
  size?: "sm" | "md" | "lg";
  showDiscountBadge?: boolean;
  className?: string;
}

const sellingPriceSize = {
  sm: "text-base",
  md: "text-price",
  lg: "text-h3",
} as const;

/**
 * BDT price display. Never shows `wholesalePrice` (Renvura's cost, not a
 * customer price) — if `sellingPrice` is null, the product simply hasn't
 * been priced for sale yet, so that's what this renders honestly.
 */
export function Price({ sellingPrice, regularPrice, size = "md", showDiscountBadge = true, className }: PriceProps) {
  if (sellingPrice === null) {
    return <p className={clsx("text-xs text-foreground/70 md:text-small", className)}>Price unavailable</p>;
  }

  const hasHigherRegularPrice = typeof regularPrice === "number" && regularPrice > sellingPrice;
  const discountPercentage = calculateDiscountPercentage(regularPrice ?? null, sellingPrice);

  return (
    <div className={clsx("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={clsx("font-semibold text-foreground tabular-nums", sellingPriceSize[size])}>
        {formatBDT(sellingPrice)}
      </span>
      {hasHigherRegularPrice && (
        <span className="text-small text-foreground/70 line-through tabular-nums">{formatBDT(regularPrice ?? null)}</span>
      )}
      {showDiscountBadge && <SaleBadge discountPercentage={discountPercentage} />}
    </div>
  );
}
