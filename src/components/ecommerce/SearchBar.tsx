"use client";

import { SearchField } from "@heroui/react";
import type { FormEvent } from "react";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}

/**
 * Search UI foundation only — input, icon, and clear state work, but
 * submitting does not run a real search or show results yet. Wire this
 * up to real product search in a later phase (see docs/PRODUCT-ROADMAP.md).
 */
export function SearchBar({ className, placeholder = "Search products…", "aria-label": ariaLabel = "Search products" }: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // No search backend yet — prevent a full page reload without pretending
    // to return results.
    event.preventDefault();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={className}>
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
