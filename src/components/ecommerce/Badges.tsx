import { Chip } from "@heroui/react";

import type { InventoryStatus } from "@/types/product";

/**
 * Verified-state badges only. Do not add "Best Seller" / "Trending" /
 * "Hot" / "Limited Stock" badges here unless product data explicitly
 * supports them (see docs/DESIGN-SYSTEM.md).
 */

interface StockBadgeProps {
  status: InventoryStatus;
  className?: string;
}

export function StockBadge({ status, className }: StockBadgeProps) {
  if (status === "in_stock") {
    return (
      <Chip color="success" variant="soft" size="sm" className={className}>
        In Stock
      </Chip>
    );
  }

  if (status === "out_of_stock") {
    return (
      <Chip color="danger" variant="soft" size="sm" className={className}>
        Out of Stock
      </Chip>
    );
  }

  // "unknown" — no verified stock signal, so no badge is shown rather than guessed.
  return null;
}

interface SaleBadgeProps {
  discountPercentage: number | null | undefined;
  className?: string;
}

export function SaleBadge({ discountPercentage, className }: SaleBadgeProps) {
  if (!discountPercentage || discountPercentage <= 0) {
    return null;
  }

  return (
    <Chip color="danger" variant="primary" size="sm" className={className}>
      -{Math.round(discountPercentage)}%
    </Chip>
  );
}
