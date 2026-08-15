# Pathao Production Readiness (Phase 15)

This document is the single source of truth for what's left before Pathao is ever enabled for
real customer orders. It exists so go-live is a deliberate, checklist-driven decision — never an
accidental side effect of an env var edit. See `CLAUDE.md`'s "Courier / fulfillment integration
(Phase 13)" section for the underlying architecture this checklist assumes.

**Current status: NOT LIVE.** `COURIER_PATHAO_ENABLED` is unset in every real Vercel environment.
Nothing in this document changes that — it prepares for a future, explicit go-live decision.

## 1. Go-live checklist

Nothing below is marked complete unless it has actually been verified — this list is intentionally
conservative.

- [ ] Real Pathao **production** merchant credentials obtained (`PATHAO_CLIENT_ID`,
      `PATHAO_CLIENT_SECRET`, `PATHAO_USERNAME`, `PATHAO_PASSWORD`) — distinct from the sandbox
      credentials currently used for local testing only.
- [ ] Production store ID verified — `PATHAO_STORE_ID` explicitly set to a real, confirmed
      production store (never auto-discovered in production; see `isPathaoProductionStoreConfigured()`
      in `src/lib/courier/config.ts`).
- [ ] Webhook secrets configured in Vercel Production: `PATHAO_WEBHOOK_SECRET` and
      `PATHAO_WEBHOOK_INTEGRATION_SECRET` (real, Pathao-issued values — currently only present with
      values only you hold; confirm they're the values Pathao's panel actually issued, not leftover
      test values).
- [ ] Pathao merchant panel webhook callback registered to `https://renvura.com/api/webhooks/pathao`
      (or `https://www.renvura.com/...` — both resolve to the same route) and the integration
      handshake re-confirmed successful (HTTP 202 + correct response header) against production.
- [ ] Product shipping weights reviewed — see "Product-weight blocker" below. As of Phase 14, 2 of
      21 catalog products have a verified `shippingWeightGrams`; the rest are `null` and will hard-block
      Pathao shipment creation until corrected (`/admin/products` shows a "Pathao Readiness" column
      for exactly this reason).
- [ ] The specific SKU planned for the first live test order has a **verified** (not guessed)
      shipping weight set in **production** `Product.inventory.shippingWeightGrams` — not just
      `renvura_sandbox`.
- [ ] Privacy Policy updated — done this pass (`src/app/privacy-policy/page.tsx`'s new "Courier &
      Delivery Partners" section) — re-review before go-live in case the actual data shared has
      changed since.
- [ ] Shipping/delivery policy reviewed — done this pass (`src/app/faq/page.tsx`'s delivery answer
      now mentions third-party courier partners) — no dedicated Shipping Policy or Terms &
      Conditions page exists in this codebase; the FAQ page is the closest functional equivalent.
      Revisit if a dedicated policy page is ever built.
- [ ] `COURIER_PATHAO_ENABLED` confirmed **still `false`** in Vercel Production immediately before
      final go-live approval — the last explicit check before flipping it.
- [ ] One controlled, low-risk **real** order selected for the first live test (see the live-test
      plan below) — a real customer order, not a synthetic one, but chosen deliberately (e.g. a
      small, low-value, easily-refundable/cancellable order).
- [ ] Monitoring/logging ready — confirm Vercel Production function logs are being watched during
      and immediately after the first live shipment creation and the first live webhook delivery
      (see `vercel logs --environment=production` usage from this session's own verification work).
- [ ] Rollback/disable procedure documented and understood by whoever flips the switch — see below.

## 2. Production enablement guard (what the code actually requires)

`isPathaoConfigured()` (`src/lib/courier/config.ts`) is the one real gate every caller checks.
Production shipment creation requires **all** of:

1. `PATHAO_CLIENT_ID`, `PATHAO_CLIENT_SECRET`, `PATHAO_USERNAME`, `PATHAO_PASSWORD` all present
   (`isPathaoCredentialsConfigured()`).
2. `COURIER_PATHAO_ENABLED=true` (`isPathaoApiEnabled()`).
3. Whenever `PATHAO_ENV=production`: `PATHAO_STORE_ID` explicitly set
   (`isPathaoProductionStoreConfigured()`) — production is never allowed to fall back to
   sandbox-style store auto-discovery, so a careless `PATHAO_ENV` flip with leftover sandbox
   config in place can never silently start creating shipments against an unintended store.

Credentials alone — even with the enable flag on — are still never sufficient in production
without an explicit store ID. No specific sandbox or production ID is ever hardcoded anywhere in
this check; it only requires that *some* value has been deliberately configured.

## 3. Rollback / kill switch

**Immediate disable:** set `COURIER_PATHAO_ENABLED=false` in Vercel Production (or remove the
variable entirely) and redeploy (or wait for the next deploy — Vercel picks up env changes on the
next build/runtime restart).

**Effect:** `isPathaoConfigured()` immediately returns `false`. `createShipmentForOrder()` and
`refreshShipmentStatus()` both return a clean `{ ok: false, error: "... is not configured." }`
instead of attempting a real API call — no new shipments can be created, no existing shipment's
status can be refreshed via the API. The admin `CourierPanel` UI falls back to manual
tracking-entry mode automatically (the same UI path used today, before Pathao is ever enabled).

**What is *not* affected:**
- Existing `Order.courier` data (consignment ID, tracking ID, tracking URL, normalized status,
  history) is never deleted or modified by disabling the provider — it stays exactly as it was.
- The customer-facing tracking timeline (`/track-order`, `/account/orders/[orderNumber]`) keeps
  showing whatever courier metadata was already recorded.
- The webhook route (`/api/webhooks/pathao`) keeps accepting and safely processing incoming
  webhook deliveries for already-created shipments (it doesn't check `COURIER_PATHAO_ENABLED` at
  all — see below) — Pathao can still notify Renvura about an in-flight parcel's status even after
  the provider is "disabled" for *new* shipment creation. This is intentional: disabling stops new
  outbound API calls, not inbound status updates for parcels already handed to the courier.

**Who can do this:** anyone with Vercel Production environment-variable write access — no code
change or deploy of application logic is required, only an env var edit.

## 4. Webhook production safety (audited this pass, unchanged — no defect found)

Re-verified against the deployed `src/app/api/webhooks/pathao/route.ts` and
`src/services/courier.ts`'s `processPathaoWebhookEvent()`:

- Signature validation (`X-PATHAO-Signature` vs `PATHAO_WEBHOOK_SECRET`, constant-time compare)
  remains mandatory for every normal event before any parsing or DB access.
- The `webhook_integration` handshake remains a distinct code path, checked before signature
  verification, and never touches the database.
- No automatic `orderStatus` transition — the webhook handler only ever writes
  `courier.rawStatusCode`/`courier.normalizedStatus`/`courier.lastSyncedAt`.
- No automatic inventory, payment, refund, or analytics mutation — structurally impossible, since
  the handler never imports or calls any of those modules.
- Unknown/unmapped events are safely acknowledged (HTTP 200) without mutating `normalizedStatus`
  (a previously-known-good status is never downgraded to "unknown" by an unrecognized event).
- An unmatched consignment ID, or a consignment ID that matches but disagrees on
  `merchant_order_id`/`store_id`, is safely acknowledged without mutating any order — verified via
  the local test matrix (order-not-found and mismatch cases) and confirmed live in production
  against an intentionally unmatched test consignment.
- `PATHAO_WEBHOOK_SECRET`/`PATHAO_WEBHOOK_INTEGRATION_SECRET` remain server-only — confirmed absent
  from the built client bundle (`.next/static`) both when first implemented and again this pass.
- The route exports `POST` only — a `GET` request correctly receives Next's default 405 (observed
  live in production logs from an external reachability check, not application code).

No behavior was changed in this pass — this section is an audit record, not a changelog.

## 5. Live test plan — PREPARED, NOT EXECUTED

This plan is written out in full so the first real Pathao production shipment is executed
deliberately, step by step, with an abort point at every stage — not attempted ad hoc. **None of
these steps have been run.** `COURIER_PATHAO_ENABLED` must be `true` in Vercel Production before
step 5 can happen at all, which itself requires every item in the go-live checklist above to be
checked first.

1. **Select one real, low-risk order.** Prefer a small-value, Cash-on-Delivery order (COD has no
   pre-collected payment to reconcile if something goes wrong) for an easily-substitutable product,
   ideally one the store can afford to have delayed or re-shipped without real customer harm.
2. **Confirm the ordered SKU has a verified shipping weight** in the **production** `Product`
   collection (`/admin/products` → "Pathao Readiness" column must read READY for every item in
   this order, not just in `renvura_sandbox`).
3. **Confirm order status is eligible** — `confirmed` or `processing` (`isOrderEligibleForShipmentCreation`).
4. **Calculate the expected COD amount** by hand from the order's own `pricing.total` and
   `payment.status` (`0` if already `paid`, otherwise the full total) — this is what
   `buildShipmentOrderInput` will compute automatically; write down the expected value beforehand
   so the real request can be sanity-checked against it.
5. **Create exactly one Pathao shipment** via `/admin/orders/[orderNumber]`'s Courier panel —
   confirm the pre-flight readiness summary reads "READY FOR PATHAO" before clicking, per this
   phase's new UI.
6. **Verify the returned consignment ID** is present and recorded on the order
   (`courier.consignmentId`, `courier.creationStatus === "created"`).
7. **Verify the Pathao delivery fee** returned in the API response (if Pathao's response includes
   one — check `courier.creationError`/any diagnostic field surfaced) is reasonable, not wildly
   different from what a manual price-calculation check would suggest.
8. **Verify Renvura's own business-state boundaries are untouched**: `orderStatus`, `payment.status`,
   `Product.inventory.stock`, and `Order.analytics.metaPurchase` all remain exactly what they were
   immediately before shipment creation — matches the same boundary checks already proven
   repeatedly against sandbox.
9. **Verify webhook delivery / manual status refresh** — either wait for a real Pathao webhook
   event for this consignment, or use "Refresh Status" in the Courier panel, and confirm
   `courier.normalizedStatus`/`rawStatusCode`/`lastSyncedAt` update as expected.
10. **Confirm no duplicate shipment** — re-attempting "Create Shipment" for the same order (if
    clicked twice, or retried) must return the existing consignment, never create a second one
    (already proven via the `courier.creationStatus` compare-and-swap, but worth re-confirming once
    against the real production account specifically).
11. **Disable the provider immediately** (`COURIER_PATHAO_ENABLED=false`) if *anything* about steps
    5–10 is unexpected — a missing consignment ID, a wildly wrong delivery fee, a business-state
    boundary that moved, a webhook that behaves differently than in sandbox. Investigate with
    Pathao's real production support channel before re-enabling, not by guessing.

## 6. Product-weight blocker (as of this pass)

2 of 21 catalog products have a verified `shippingWeightGrams` (Bioaqua Lip Sleeping Mask — 20g;
LANBENA Blackhead Remover Mask — 5g, see the Phase 14 audit in `CLAUDE.md`). The remaining 19 are
`null` and will hard-block Pathao API shipment creation for any order containing them, in both
`renvura_sandbox` and production `renvura` (this data was only ever updated in the sandbox
database — production's `Product` collection has not been touched by that audit and still has
`shippingWeightGrams: null` for all 21 products). Resolving this for production requires either
real supplier documentation for the remaining products or physically weighing them — no shortcut
exists that doesn't involve fabricating a number, which this project's data-integrity rules
explicitly forbid.
