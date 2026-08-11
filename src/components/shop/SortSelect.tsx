"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ProductSortOption } from "@/services/products";

const SORT_LABELS: Record<ProductSortOption, string> = {
  featured: "Featured",
  "name-asc": "Name: A to Z",
  "name-desc": "Name: Z to A",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

interface SortSelectProps {
  currentSort: ProductSortOption;
  availableSorts: ProductSortOption[];
  className?: string;
}

/**
 * The one interactive control on the listing page that needs client JS —
 * navigating on change. Category pills and pagination are plain server-
 * rendered links; this needs `router.push` because a native `<select>`
 * has no href to navigate to on its own.
 */
export function SortSelect({ currentSort, availableSorts, className }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (event.target.value === "featured") {
      params.delete("sort");
    } else {
      params.set("sort", event.target.value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      aria-label="Sort products"
      value={currentSort}
      onChange={handleChange}
      className={`h-10 rounded-full border border-border bg-surface px-4 text-small text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className ?? ""}`}
    >
      {availableSorts.map((option) => (
        <option key={option} value={option}>
          {SORT_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
