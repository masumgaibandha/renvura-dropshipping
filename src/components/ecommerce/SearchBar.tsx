"use client";

import { SearchField } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { trackGaSearch } from "@/lib/analytics/ga4-client";
import { trackMetaSearch } from "@/lib/analytics/meta-client";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}

/**
 * `useSearchParams()` (used to prefill the box when already on
 * `/shop?q=...`) requires a Suspense boundary — SearchBar renders on every
 * page via Header/MobileNav, including statically-prerendered ones, so
 * without this boundary `next build` fails. The boundary lives here, at
 * the source of the dynamic API, so callers don't need to add their own.
 */
export function SearchBar(props: SearchBarProps) {
  return (
    <Suspense fallback={<SearchBarFallback {...props} />}>
      <SearchBarField {...props} />
    </Suspense>
  );
}

function SearchBarField({ className, placeholder = "Search products…", "aria-label": ariaLabel = "Search products" }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      // Fired once per real search submission, never per keystroke.
      trackMetaSearch({ searchString: trimmed });
      trackGaSearch({ searchString: trimmed });
    }
    router.push(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : "/shop");
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={className}>
      <SearchField.Root aria-label={ariaLabel} fullWidth className="w-full" value={value} onChange={setValue}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={placeholder} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField.Root>
    </form>
  );
}

/** Pre-hydration/static fallback — same markup, uncontrolled, so there's no layout shift. */
function SearchBarFallback({ className, placeholder = "Search products…", "aria-label": ariaLabel = "Search products" }: SearchBarProps) {
  return (
    <form role="search" className={className}>
      <SearchField.Root aria-label={ariaLabel} fullWidth className="w-full">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={placeholder} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField.Root>
    </form>
  );
}
