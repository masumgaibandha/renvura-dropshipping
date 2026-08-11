"use client";

import { createContext, use, useCallback, useSyncExternalStore, type ReactNode } from "react";

import { readJSON, writeJSON } from "@/lib/local-storage";

const WISHLIST_STORAGE_KEY = "renvura:wishlist:v1";
/** Sentinel — see the matching comment in CartContext.tsx for why this reference-identity trick
 * is the hydration signal instead of a separate boolean flag. */
const EMPTY_SLUGS: string[] = [];

function isSlugArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

let wishlistSlugs: string[] = EMPTY_SLUGS;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function hydrateOnce() {
  if (wishlistSlugs !== EMPTY_SLUGS) return;
  const stored = readJSON(WISHLIST_STORAGE_KEY, isSlugArray);
  wishlistSlugs = stored ?? [];
  notify();
}

function subscribe(listener: () => void) {
  hydrateOnce();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return wishlistSlugs;
}

function getServerSnapshot() {
  return EMPTY_SLUGS;
}

function setSlugs(next: string[]) {
  wishlistSlugs = next;
  writeJSON(WISHLIST_STORAGE_KEY, wishlistSlugs);
  notify();
}

interface WishlistContextValue {
  slugs: string[];
  count: number;
  isHydrated: boolean;
  isWishlisted: (slug: string) => boolean;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  toggle: (slug: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Guest wishlist — just a list of product slugs (this catalog's `id`
 * equals `slug`, so that alone is enough to identify and later look up a
 * product; no other product data is duplicated here). Same
 * `useSyncExternalStore`-backed, hydration-safe localStorage pattern as
 * CartContext.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = slugs !== EMPTY_SLUGS;

  const add = useCallback((slug: string) => {
    if (!wishlistSlugs.includes(slug)) setSlugs([...wishlistSlugs, slug]);
  }, []);
  const remove = useCallback((slug: string) => {
    setSlugs(wishlistSlugs.filter((entry) => entry !== slug));
  }, []);
  const toggle = useCallback((slug: string) => {
    setSlugs(wishlistSlugs.includes(slug) ? wishlistSlugs.filter((entry) => entry !== slug) : [...wishlistSlugs, slug]);
  }, []);

  const value: WishlistContextValue = {
    slugs,
    count: slugs.length,
    isHydrated,
    isWishlisted: (slug) => slugs.includes(slug),
    add,
    remove,
    toggle,
  };

  return <WishlistContext value={value}>{children}</WishlistContext>;
}

export function useWishlist(): WishlistContextValue {
  const context = use(WishlistContext);
  if (!context) {
    throw new Error("useWishlist used outside <WishlistProvider>");
  }
  return context;
}
