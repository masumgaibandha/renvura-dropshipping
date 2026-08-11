"use client";

import { createContext, use, useCallback, useState, useSyncExternalStore, type ReactNode } from "react";

import { readJSON, writeJSON } from "@/lib/local-storage";
import type { CartItem, CartItemInput } from "@/types/cart";

const CART_STORAGE_KEY = "renvura:cart:v1";
/** Sentinel reference — both the server snapshot and the pre-hydration client snapshot, so
 * `items !== EMPTY_ITEMS` reliably means "hydration has happened," even when the real stored
 * cart is itself empty (hydration always assigns a *new* array either way). */
const EMPTY_ITEMS: CartItem[] = [];

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    (item.image === null || typeof item.image === "string") &&
    typeof item.sellingPrice === "number" &&
    typeof item.quantity === "number" &&
    item.quantity >= 1
  );
}

function isCartItemArray(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.every(isCartItem);
}

type Action =
  | { type: "ADD"; item: CartItemInput; quantity: number }
  | { type: "REMOVE"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "CLEAR" };

function cartReducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "ADD": {
      // Defensive gate — the UI already disables Add to Cart when this would be true, this is
      // the second line of defense so an invalid line item can never be constructed at all.
      if (action.item.sellingPrice === null || action.item.sellingPrice === undefined || action.quantity < 1) {
        return state;
      }

      const cap = action.item.maxQuantity ?? Number.POSITIVE_INFINITY;
      const existing = state.find((cartItem) => cartItem.productId === action.item.productId);

      if (existing) {
        const nextQuantity = Math.min(existing.quantity + action.quantity, cap);
        return state.map((cartItem) => (cartItem.productId === action.item.productId ? { ...cartItem, quantity: nextQuantity } : cartItem));
      }

      return [...state, { ...action.item, quantity: Math.min(action.quantity, cap) }];
    }

    case "REMOVE":
      return state.filter((cartItem) => cartItem.productId !== action.productId);

    case "UPDATE_QUANTITY": {
      const clampedQuantity = Math.max(1, action.quantity);
      return state.map((cartItem) =>
        cartItem.productId === action.productId
          ? { ...cartItem, quantity: Math.min(clampedQuantity, cartItem.maxQuantity ?? Number.POSITIVE_INFINITY) }
          : cartItem,
      );
    }

    case "CLEAR":
      return [];

    default:
      return state;
  }
}

/**
 * Module-level store (one per page load) backing the cart's persisted
 * items. Deliberately not plain React state — reading localStorage
 * hydration-safely (no SSR mismatch, no "setState synchronously in an
 * effect" — the React Compiler lint rule this project runs correctly
 * flags that as an anti-pattern) is exactly what `useSyncExternalStore`
 * exists for, so that's the mechanism used here instead of a
 * useEffect-based read-on-mount. Mutations still go through the reducer
 * above; this is the subscribe/snapshot plumbing around it.
 */
let cartItems: CartItem[] = EMPTY_ITEMS;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function hydrateOnce() {
  if (cartItems !== EMPTY_ITEMS) return; // already hydrated this page load
  const stored = readJSON(CART_STORAGE_KEY, isCartItemArray);
  cartItems = stored ?? [];
  notify();
}

function subscribe(listener: () => void) {
  hydrateOnce();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cartItems;
}

function getServerSnapshot() {
  return EMPTY_ITEMS;
}

function dispatchCart(action: Action) {
  cartItems = cartReducer(cartItems, action);
  writeJSON(CART_STORAGE_KEY, cartItems);
  notify();
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: CartItemInput, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Guest cart state — React Context wrapping a small external store (see
 * above) — no Zustand/Redux; the cart is small and self-contained enough
 * not to need it. Persisted to localStorage for guests. IMPORTANT: this is
 * a display convenience only — stored prices/quantities are never a
 * trusted source of truth. A future checkout/order-creation step must
 * re-fetch and validate price and availability from real product data (or
 * a real backend) before creating an order; nothing here should ever be
 * trusted directly for that. See docs/ARCHITECTURE.md.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = items !== EMPTY_ITEMS;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);

  const addItem = useCallback((item: CartItemInput, quantity = 1) => {
    dispatchCart({ type: "ADD", item, quantity });
    setIsDrawerOpen(true);
  }, []);
  const removeItem = useCallback((productId: string) => dispatchCart({ type: "REMOVE", productId }), []);
  const updateQuantity = useCallback((productId: string, quantity: number) => dispatchCart({ type: "UPDATE_QUANTITY", productId, quantity }), []);
  const clearCart = useCallback(() => dispatchCart({ type: "CLEAR" }), []);

  const value: CartContextValue = {
    items,
    itemCount,
    subtotal,
    isHydrated,
    isDrawerOpen,
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart(): CartContextValue {
  const context = use(CartContext);
  if (!context) {
    throw new Error("useCart used outside <CartProvider>");
  }
  return context;
}
