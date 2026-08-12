"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { adminUpdateCategory } from "@/actions/admin/categories";

interface CategoryOrderFormProps {
  slug: string;
  name: string;
  description: string | null;
  parentSlug: string | null;
  displayOrder: number;
}

/** Only exposes `displayOrder` — re-submits the category's other fields unchanged so this stays a single-purpose control rather than a full category editor (see /admin/categories for that). */
export function CategoryOrderForm({ slug, name, description, parentSlug, displayOrder }: CategoryOrderFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(displayOrder));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      setError("Whole number");
      return;
    }

    startTransition(async () => {
      const result = await adminUpdateCategory(slug, { name, description, parentSlug, displayOrder: parsed });
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
        aria-label={`Display order for ${name}`}
        className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-small text-foreground"
      />
      <Button type="submit" variant="secondary" size="sm" isDisabled={isPending}>
        {isPending ? "…" : "Save"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
