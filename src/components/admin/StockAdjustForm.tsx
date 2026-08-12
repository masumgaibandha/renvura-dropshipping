"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { adminAdjustStock } from "@/actions/admin/products";

/** Inline per-row stock editor for /admin/inventory — admin enters the new absolute stock count (not a +/- delta), matching what `AdminProductInput.stock` and the product edit form both already use, so there's exactly one mental model for "what stock means" across the admin surface. */
export function StockAdjustForm({ slug, currentStock }: { slug: string; currentStock: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(currentStock !== null ? String(currentStock) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Whole number ≥ 0");
      return;
    }

    startTransition(async () => {
      const result = await adminAdjustStock(slug, parsed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        inputMode="numeric"
        aria-label={`Stock for ${slug}`}
        className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-small text-foreground"
      />
      <Button type="submit" variant="secondary" size="sm" isDisabled={isPending}>
        {isPending ? "…" : "Update"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
