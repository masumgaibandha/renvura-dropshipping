"use client";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  /** Real verified stock count, when known — caps the selector rather than allowing an arbitrary number. */
  max?: number | null;
  className?: string;
}

/**
 * Controlled — the caller owns the quantity (BuyBox needs it for the Add
 * to Cart/Buy Now click, CartDrawer/cart page need it to update an
 * existing line). Minimum 1; capped at real `inventory.stock`/
 * `maxQuantity` when known, never an invented limit.
 */
export function QuantitySelector({ value, onChange, max, className }: QuantitySelectorProps) {
  const hasMax = typeof max === "number" && max > 0;
  const atMax = hasMax && value >= max;

  function decrement() {
    onChange(Math.max(1, value - 1));
  }

  function increment() {
    onChange(hasMax ? Math.min(max, value + 1) : value + 1);
  }

  return (
    <div className={`inline-flex h-11 items-center rounded-full border border-border ${className ?? ""}`}>
      <button
        type="button"
        onClick={decrement}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="flex h-full w-10 items-center justify-center text-foreground transition-colors hover:text-accent disabled:pointer-events-none disabled:text-foreground/40"
      >
        −
      </button>
      <span aria-live="polite" className="w-8 text-center text-small font-medium tabular-nums text-foreground">
        {value}
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
