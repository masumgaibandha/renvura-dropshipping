# Pathao Production Readiness (Phase 15–16)

This document is the single source of truth for what's left before Pathao is ever enabled for
real customer orders. It exists so go-live is a deliberate, checklist-driven decision — never an
accidental side effect of an env var edit. See `CLAUDE.md`'s "Courier / fulfillment integration
(Phase 13)" section for the underlying architecture this checklist assumes.

**Current status: NOT LIVE.** `COURIER_PATHAO_ENABLED` is unset in every real Vercel environment.
Nothing in this document changes that — it prepares for a future, explicit go-live decision.

## Phase 16 — production activation preparation (current verified state)

Re-verified against Vercel Production directly this pass (names only, no values ever printed):

| Variable | Present in Vercel Production? |
|---|---|
| `PATHAO_ENV` | **Missing** |
| `PATHAO_CLIENT_ID` | **Missing** |
| `PATHAO_CLIENT_SECRET` | **Missing** |
| `PATHAO_USERNAME` | **Missing** |
| `PATHAO_PASSWORD` | **Missing** |
| `PATHAO_STORE_ID` | **Missing** |
| `COURIER_PATHAO_ENABLED` | **Missing** (unset — correct, expected state) |
| `PATHAO_WEBHOOK_SECRET` | Present (added Phase 14, needed for the webhook receiver to function) |
| `PATHAO_WEBHOOK_INTEGRATION_SECRET` | Present (added Phase 14, same reason) |

**Production store readiness: BLOCKED.** No production credentials exist at all, so there is
nothing to discover or verify a store ID against yet. This is the first, hard blocker — every
other item in this document is downstream of obtaining real production credentials from Pathao.
Sandbox store ID `150696` must never be reused for production (it is a distinct, sandbox-only
value tied to sandbox credentials — production requires its own real store, registered under real
production credentials).

**Production base URL:** confirmed in code (`src/lib/courier/config.ts`) —
`PATHAO_PRODUCTION_BASE_URL = "https://api-hermes.pathao.com"`, selected only when
`PATHAO_ENV === "production"` exactly (`getPathaoEnv()` defaults to `"sandbox"` for anything else,
including unset). No network request was made to confirm this pass — this is a static code read,
not a live production API call.

**Webhook readiness: re-confirmed, unchanged.** `https://renvura.com/api/webhooks/pathao` (via the
`www` redirect) is still deployed and enforcing signature validation — re-verified this pass with a
read-only negative-control request (missing signature → `401`, no mutation). The handshake, a real
Pathao TEST event, and the integration response header were all already verified live against
production in Phase 14/15 (see `CLAUDE.md`'s "Pathao webhook (Phase 14)" section) — not re-run this
pass, since nothing about the deployed code changed and a full re-test isn't needed to reconfirm a
negative control still holds. No defect found; no behavior changed.

**Product weight readiness:**
- Total SKUs: 21 (source catalog, `src/data/products.ts`)
- Resolved (verified) weights: 2 — Bioaqua Lip Sleeping Mask (20g), LANBENA Blackhead Remover Mask (5g)
- Unresolved: 19 — `null`, per the Phase 14 audit's strict evidence rules (no supplier weight statement found, and volume-only figures were deliberately not converted via an assumed density)
- **Production `Product` collection**: has **zero** `shippingWeightGrams` values populated — the
  Phase 14 audit only ever wrote to `renvura_sandbox`. This pass did not query production MongoDB
  to re-confirm this (querying production is off-limits even read-only per this project's standing
  rule); it is taken as given, consistent with every prior phase's account of what was and wasn't
  written where.

### Chosen live-test SKU: `bioaqua-lip-sleeping-mask`

**Bioaqua Lip Sleeping Mask 20g** — selling price ৳790, verified shipping weight 20g.

Why this one over LANBENA Blackhead Remover Mask (the other verified-weight SKU):
- Both have a verified weight and low monetary value (৳790 vs ৳690 — comparable).
- **Bioaqua has no known catalog data mismatch.** Its 20g weight was read directly off an
  unambiguous "20g/0.7FL.OZ.e" printed on the product packaging in the source photo.
- **LANBENA does have a documented ambiguity** (`src/data/products.ts`'s own `dataQualityNotes`):
  the supplier's "Product weight: 5g" field is unclear whether it means per-piece or total-pack
  weight, and the pack is titled "5 pc" — a genuine, acknowledged open question, not resolved.
- Bioaqua is a single self-contained jar (simple packaging); LANBENA is a multi-piece pack, a
  slightly more complex shipment to reason about for a first live test.
- Both have ample stock (Bioaqua: 100, LANBENA: 450) — not a differentiator.

For the live test: **quantity 1**, a single Bioaqua Lip Sleeping Mask.

### Expected COD logic (conceptual only — not applied to any real order)

`Renvura's delivery fee is a live, admin-editable StoreSettings value — not re-read from production
this pass (would require a production DB read, off-limits). Using the documented business-approved
starting values (`src/config/delivery.ts`'s fallback, ৳80 inside Dhaka / ৳150 outside Dhaka) purely
to illustrate the arithmetic; the real value in effect at test time must be read from the live
`StoreSettings` singleton when the actual test order is placed, not assumed from this document.

- Product selling price: ৳790
- + Delivery fee: ৳80 (inside Dhaka) or ৳150 (outside Dhaka)
- = Authoritative order total: **৳870** (inside Dhaka) or **৳940** (outside Dhaka)

- If the test order is **unpaid COD**: Pathao `amount_to_collect` should equal the authoritative
  order total above (`payment.status !== "paid"` branch of `buildShipmentOrderInput`).
- If the test order is **prepaid/already verified paid**: `amount_to_collect` should be `0`
  (`payment.status === "paid"` branch).

No pricing was modified to produce these numbers.

### Production database weight-migration plan (prepared, NOT executed)

Mirrors the exact read-verify-write-verify pattern used for every sandbox write this project has
ever done, targeted at production for the first time — with an extra compare-before-write step
since production is real customer-facing data:

1. **Confirm active DB name is exactly `renvura` (production)** before anything else — the inverse
   of every sandbox script's `renvura_sandbox` assertion. Abort immediately if it's anything else.
2. **Read current state first** — fetch `inventory.shippingWeightGrams` for exactly the two slugs
   below and print it, even if expected to be `null`. Never assume the current value.
3. **Compare before write** — if a slug's current value is already non-null and *different* from
   the intended value, STOP and report the conflict rather than overwriting silently (someone may
   have already set a real production value another way).
4. **Update only `inventory.shippingWeightGrams`**, via a scoped `$set` on that single dot-path —
   never a full-document replace, never touching price, stock, status, or any other field.
5. **Identify by stable slug**, never by Mongo `_id`:
   - `bioaqua-lip-sleeping-mask` → `20`
   - `lanbena-blackhead-remover-mask` → `5`
6. **Read back and report before/after** for both slugs after the write, matching the exact format
   used for every sandbox weight update in Phase 14.
7. **Rollback**: since the "before" value is always captured and printed in step 2, reverting is a
   single `$set` back to that exact captured value (expected `null` in both cases, since production
   has never had these populated) — no destructive operation, no backup file needed beyond what's
   already printed in the migration's own output.

This plan is not executed by this document. It requires an explicit, separate instruction to run
against production, per this project's standing "never write to production without being told to"
rule.

### Exact future go-live sequence

Documented once, here, as the authoritative order — every other reference to "the enablement
sequence" in this project should point back to this list, not restate it:

1. Verify production credentials (`PATHAO_CLIENT_ID`/`SECRET`/`USERNAME`/`PASSWORD`) are real and
   obtained directly from Pathao's merchant panel — never guessed or reused from sandbox.
2. Verify the production store ID — obtained via Pathao's real production Store Info/merchant
   dashboard, never sandbox store `150696`.
3. Verify the webhook — callback registered, handshake + a real Pathao TEST event pass against
   production (already done in Phase 14/15; reconfirm if the callback is ever re-registered).
4. Update the chosen production SKU's `shippingWeightGrams` in **production** MongoDB (the
   migration plan above) — and only that SKU/those two SKUs, not a blanket catalog write.
5. Create or identify one controlled real order for the live test.
6. Confirm that order through the normal manual phone/WhatsApp process (`pending → confirmed`).
7. Set `PATHAO_ENV=production` in Vercel Production.
8. Set the real production credentials/store ID in Vercel Production.
9. **Last step, only after everything above is verified**: set `COURIER_PATHAO_ENABLED=true`.
10. Redeploy (or wait for env changes to take effect).
11. Create exactly one Pathao shipment for the one controlled order.
12. Verify the returned consignment ID, status, and a real webhook delivery/manual refresh for it.
13. If *anything* in steps 11–12 is unexpected: immediately set `COURIER_PATHAO_ENABLED=false` and
    investigate before retrying.

The activation flag (`COURIER_PATHAO_ENABLED=true`) is deliberately the **last** configuration
step, never the first — every credential and the store ID must already be in place and verified
before it's flipped, so flipping it is never the moment something else gets checked for the first
time.

### Kill switch (reconfirmed, unchanged from Phase 15)

Set `COURIER_PATHAO_ENABLED=false` in Vercel Production (or remove it) and redeploy. This
immediately stops new Pathao API shipment creation — `isPathaoConfigured()` returns `false`,
`createShipmentForOrder()`/`refreshShipmentStatus()` fail cleanly without a network call. Existing
`Order.courier` data, tracking display, and inbound webhook processing for already-created
shipments are unaffected (the webhook route doesn't gate on this flag at all). Credentials are
never deleted merely to disable the provider — removing the enable flag alone is sufficient and
is the intended, reversible mechanism.

### Live-test success criteria

The one controlled production shipment (step 11 above) is only a success if **all** of the
following hold — any failure means step 13 (immediate disable) applies:

- A real consignment ID is returned and persisted (`courier.creationStatus === "created"`).
- The Pathao delivery fee/response is plausible, not wildly inconsistent with a manual estimate.
- `orderStatus`, `payment.status`, `Product.inventory.stock`, and `Order.analytics.metaPurchase`
  are all byte-for-byte unchanged from immediately before shipment creation.
- A second "Create Shipment" attempt for the same order returns the existing consignment, never a
  second one.
- Either a real Pathao webhook delivery or a manual "Refresh Status" call successfully updates
  `courier.normalizedStatus`/`rawStatusCode`/`lastSyncedAt` for this specific consignment.
- Nothing in Vercel Production logs indicates an unexpected error, retry storm, or unhandled
  exception during or immediately after the test.

### Admin go-live UX (Phase 16)

Assessed whether an admin could accidentally create a production shipment without realizing
Pathao is live: the prior "Pathao: Sandbox"/"Pathao: Production" indicator (`CourierPanel.tsx`,
`/admin/settings/delivery`) used identical neutral styling for both states — only the word
differed. An admin used to always seeing "Sandbox" could plausibly not notice the day it reads
"Production" in the exact same low-contrast pill. Fixed this pass: the production state now reads
"⚠ Production (live)" in a distinct amber/warning style, while sandbox stays neutral — the visual
weight changes, not only the text. No confirmation modal was added — a passive status indicator
change is proportionate to the risk here (the real gate remains `COURIER_PATHAO_ENABLED`, which
requires a Vercel environment-variable edit, not a click any admin user could make from this UI);
a modal would add friction without closing any actual gap this indicator doesn't already close.

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
