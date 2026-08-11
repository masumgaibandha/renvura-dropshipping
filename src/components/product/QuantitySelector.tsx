"use client";

import { useState } from "react";

interface QuantitySelectorProps {
  /** Real verified stock count, when known — caps the selector rather than allowing an arbitrary number. */
  max?: number | null;
  className?: string;
}

/**
 * UI foundation only — no cart to add a quantity to yet, so this isn't
 * wired to anything. Minimum 1; capped at real `inventory.stock` when
 * that's a known number, not an invented limit.
 */
export function QuantitySelector({ max, className }: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(1);
  const hasMax = typeof max === "number" && max > 0;
  const atMax = hasMax && quantity >= max;

  function decrement() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increment() {
    setQuantity((current) => (hasMax ? Math.min(max, current + 1) : current + 1));
  }

  return (
    <div className={`inline-flex h-11 items-center rounded-full border border-border ${className ?? ""}`}>
      <button
        type="button"
        onClick={decrement}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
        className="flex h-full w-10 items-center justify-center text-foreground transition-colors hover:text-accent disabled:pointer-events-none disabled:text-foreground/40"
      >
        −
      </button>
      <span aria-live="polite" className="w-8 text-center text-small font-medium tabular-nums text-foreground">
        {quantity}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={atMax}
        aria-label="Increase quantity"
        className="flex h-full w-10 items-center justify-center text-foreground transition-colors hover:text-accent disabled:pointer-events-none disabled:text-foreground/40"
      >
        +
      </button>
    </div>
  );
}
