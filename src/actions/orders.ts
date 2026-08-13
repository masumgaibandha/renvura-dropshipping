"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";

import { isPaymentMethodConfigured } from "@/config/payment";
import { getCurrentUser } from "@/lib/auth-session";
import { sendOrderConfirmationEmail } from "@/lib/email-provider";
import { checkRateLimit } from "@/lib/rate-limit";
import { isMetaCapiConfigured } from "@/lib/analytics/config";
import { purchaseEventId } from "@/lib/analytics/event-id";
import { orderItemToAnalyticsItem } from "@/lib/analytics/mapping";
import { sendMetaCapiPurchase } from "@/lib/analytics/meta-server";
import {
  findOrderByIdempotencyKey,
  findOrderByOrderNumber,
  generateOrderNumber,
  insertOrder,
  recordMetaPurchaseResult,
  recordOrderConfirmationEmailResult,
  toOrderSummary,
  toTrackingSummary,
} from "@/services/orders";
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

const MAX_STORED_EMAIL_ERROR_LENGTH = 500;

/**
 * Fires the order-confirmation email (Phase 10.5) via Next's `after()` —
 * scheduled to run once the response has already been sent, so a slow or
 * failed Resend call can never delay/affect what the customer sees. Only
 * ever called from the genuinely-new-order branch of `createOrder` (never
 * the idempotent-replay or race-loser early returns), which is what makes
 * this naturally idempotent — a retried submit with the same
 * `idempotencyKey` returns before this is ever scheduled a second time.
 */
function scheduleOrderConfirmationEmail(order: OrderSummary): void {
  const email = order.customer.email;
  if (!email) {
    return;
  }

  after(async () => {
    const result = await sendOrderConfirmationEmail({ to: email, order });
    if (result.status === "sent") {
      await recordOrderConfirmationEmailResult(order.orderNumber, { status: "sent", providerMessageId: result.providerMessageId });
      return;
    }

    console.error(`createOrder: order confirmation email failed for ${order.orderNumber}`, result.lastError);
    await recordOrderConfirmationEmailResult(order.orderNumber, {
      status: "failed",
      lastError: result.lastError.slice(0, MAX_STORED_EMAIL_ERROR_LENGTH),
    });
  });
}

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}

/**
 * Fires the Meta CAPI Purchase event (Phase 11) via `after()`, same deferred/non-blocking pattern
 * as `scheduleOrderConfirmationEmail` above, and called from the exact same genuinely-new-order
 * call site — `createOrder`'s idempotency-key early return and race-loser early return both
 * return before this call site, so a retried/racing submit can never schedule a second CAPI send
 * for the same order (see `docs/ARCHITECTURE.md`'s Phase 11 "Purchase CAPI idempotency" note).
 *
 * IP/user-agent/`_fbp`/`_fbc` are read from the *current* request (the checkout submission
 * itself) — never fabricated, and simply omitted from the CAPI payload when a header/cookie is
 * genuinely absent (`sendMetaCapiPurchase`'s `buildUserData` already handles that). The forwarded
 * IP is trusted the same way `getClientIp()` above already does for rate limiting — Vercel's own
 * edge network sets `x-forwarded-for`, this is never client-suppliable.
 */
function scheduleMetaPurchaseCapi(order: OrderSummary, requestContext: { ip: string; userAgent: string | null; fbp: string | null; fbc: string | null; eventSourceUrl: string }): void {
  if (!isMetaCapiConfigured()) {
    return;
  }

  after(async () => {
    const analyticsItems = order.items.map(orderItemToAnalyticsItem);
    const result = await sendMetaCapiPurchase({
      purchase: {
        eventId: purchaseEventId(order.orderNumber),
        orderNumber: order.orderNumber,
        items: analyticsItems,
        value: order.pricing.total,
        deliveryFee: order.pricing.deliveryFee,
      },
      eventSourceUrl: requestContext.eventSourceUrl,
      userData: {
        email: order.customer.email ?? null,
        phone: order.customer.phone,
        clientIpAddress: requestContext.ip === "unknown" ? null : requestContext.ip,
        clientUserAgent: requestContext.userAgent,
        fbp: requestContext.fbp,
        fbc: requestContext.fbc,
      },
    });

    if (result.status === "sent") {
      await recordMetaPurchaseResult(order.orderNumber, { status: "sent" });
      return;
    }
    if (result.status === "failed") {
      console.error(`createOrder: Meta CAPI Purchase failed for ${order.orderNumber}`, result.error);
      await recordMetaPurchaseResult(order.orderNumber, { status: "failed" });
    }
    // "not_configured" — nothing to record; insertOrder already set analytics.metaPurchase.status
    // to "not_applicable" for this case.
  });
}

/** Best-effort, never-throwing collection of the analytics request context — a failure here must never affect order creation. */
async function getAnalyticsRequestContext(orderNumber: string): Promise<{ ip: string; userAgent: string | null; fbp: string | null; fbc: string | null; eventSourceUrl: string }> {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    const host = headersList.get("host") ?? "";
    return {
      ip: await getClientIp(),
      userAgent: headersList.get("user-agent"),
      fbp: cookieStore.get("_fbp")?.value ?? null,
      fbc: cookieStore.get("_fbc")?.value ?? null,
      eventSourceUrl: host ? `${proto}://${host}/order-success/${orderNumber}` : `/order-success/${orderNumber}`,
    };
  } catch {
    return { ip: "unknown", userAgent: null, fbp: null, fbc: null, eventSourceUrl: `/order-success/${orderNumber}` };
  }
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
  const recalculated = await recalculateOrder(input.items, input.shippingAddress.district);
  if (!recalculated.ok) {
    return { ok: false, error: recalculated.error };
  }

  const paymentStatus: PaymentStatus = input.payment.method === "cash_on_delivery" ? "cod_pending" : "pending_verification";

  // Guest checkout must work even if the auth subsystem itself has a problem — a session-lookup
  // failure here degrades to "treat as guest," never blocks order creation.
  let customerUserId: string | null = null;
  try {
    const user = await getCurrentUser();
    customerUserId = user?.id ?? null;
  } catch (error) {
    console.error("createOrder: session lookup failed, proceeding as guest", error);
  }

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
      customerUserId,
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
    const order = toOrderSummary(record);
    scheduleOrderConfirmationEmail(order);
    scheduleMetaPurchaseCapi(order, await getAnalyticsRequestContext(order.orderNumber));
    return { ok: true, order };
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
