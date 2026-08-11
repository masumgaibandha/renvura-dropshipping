"use server";

import { headers } from "next/headers";

import { isPaymentMethodConfigured } from "@/config/payment";
import { checkRateLimit } from "@/lib/rate-limit";
import { findOrderByIdempotencyKey, findOrderByOrderNumber, generateOrderNumber, insertOrder, toOrderSummary, toTrackingSummary } from "@/services/orders";
import type { OrderSummary, OrderTrackingSummary, PaymentStatus } from "@/types/order";
import { recalculateOrder } from "./order-logic";
import { orderInputSchema, trackOrderInputSchema } from "./order-schema";

/**
 * The two Server Actions that back checkout and order tracking. Both treat
 * their input as fully untrusted (Next.js's own guidance: a Server Action
 * is "reachable to anyone who can send the same POST," schema validation
 * only checks shape) — see `order-schema.ts` for validation and
 * `order-logic.ts` for the price recalculation that never trusts a
 * client-submitted price.
 */

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}

function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

export type CreateOrderResult = { ok: true; order: OrderSummary } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createOrder(rawInput: unknown): Promise<CreateOrderResult> {
  const ip = await getClientIp();
  if (!checkRateLimit(`createOrder:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 })) {
    return { ok: false, error: "Too many order attempts. Please wait a few minutes and try again." };
  }

  const parsed = orderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }
  const input = parsed.data;

  if (input.payment.method !== "cash_on_delivery" && !isPaymentMethodConfigured(input.payment.method)) {
    return { ok: false, error: "This payment method is temporarily unavailable. Please choose another." };
  }

  // The only place prices/availability are decided — productId/quantity are the only client input used.
  // Runs before any DB call: no reason to touch the database for an order that's invalid anyway.
  const recalculated = recalculateOrder(input.items, input.shippingAddress.district);
  if (!recalculated.ok) {
    return { ok: false, error: recalculated.error };
  }

  const paymentStatus: PaymentStatus = input.payment.method === "cash_on_delivery" ? "cod_pending" : "pending_verification";

  // Everything from here touches MongoDB — one try/catch so a connection failure at *any* step
  // (idempotency lookup, order-number generation, or insert) is a clean `{ ok: false }`, never an
  // unhandled exception surfaced raw to the client.
  try {
    // Idempotency: a prior successful call with this key returns the same order rather than reprocessing.
    const existing = await findOrderByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { ok: true, order: toOrderSummary(existing) };
    }

    const orderNumber = await generateOrderNumber();

    const record = await insertOrder({
      orderNumber,
      idempotencyKey: input.idempotencyKey,
      customer: {
        name: input.customer.name,
        phone: input.customer.phone,
        email: input.customer.email ?? null,
      },
      shippingAddress: {
        division: input.shippingAddress.division,
        district: input.shippingAddress.district,
        upazila: input.shippingAddress.upazila,
        addressLine: input.shippingAddress.addressLine,
        landmark: input.shippingAddress.landmark ?? null,
        notes: input.shippingAddress.notes ?? null,
      },
      items: recalculated.items,
      pricing: recalculated.pricing,
      payment: {
        method: input.payment.method,
        transactionId: input.payment.method === "cash_on_delivery" ? null : (input.payment.transactionId ?? null),
        status: paymentStatus,
      },
    });
    return { ok: true, order: toOrderSummary(record) };
  } catch (error) {
    // Race: two near-simultaneous submits both passed the findOrderByIdempotencyKey check above.
    if (isDuplicateKeyError(error)) {
      const raceWinner = await findOrderByIdempotencyKey(input.idempotencyKey);
      if (raceWinner) {
        return { ok: true, order: toOrderSummary(raceWinner) };
      }
    }
    console.error("createOrder: failed to create order", error);
    return { ok: false, error: "Something went wrong placing your order. Please try again." };
  }
}

export type TrackOrderResult = { ok: true; order: OrderTrackingSummary } | { ok: false; error: string };

export async function trackOrder(rawInput: unknown): Promise<TrackOrderResult> {
  const ip = await getClientIp();
  if (!checkRateLimit(`trackOrder:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 })) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = trackOrderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid order number and phone number." };
  }

  const orderNumber = parsed.data.orderNumber.trim().toUpperCase();
  const phone = parsed.data.phone;

  try {
    const record = await findOrderByOrderNumber(orderNumber);
    // Same generic message for "no such order" and "wrong phone" — never reveal which one was wrong.
    if (!record || record.customer.phone !== phone) {
      return { ok: false, error: "No matching order found. Check your order number and phone number." };
    }

    return { ok: true, order: toTrackingSummary(record) };
  } catch (error) {
    console.error("trackOrder: lookup failed", error);
    return { ok: false, error: "Something went wrong looking up your order. Please try again." };
  }
}
