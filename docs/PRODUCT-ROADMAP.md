# Product Roadmap

This roadmap defines the intended build order. **Phases 1–8 are complete.** Phase 4 (Homepage) was
pulled forward and completed inside Phase 3's redesign pass (see the Phase 3 entry below for why).
Do not start a later phase without explicit confirmation — each phase should be scoped and agreed
before work begins.

## Phase 1 — Foundation ✅
Project initialization, Next.js/TypeScript/Tailwind/HeroUI setup, folder structure, brand
configuration, documentation, resource/asset inspection, git init and first push.

## Phase 2 — Product data / model ✅
Extracted verified product data from all 21 `resources/products/` supplier screenshots (title,
price, SKU, category, description, specs — see `docs/PRODUCT-DATA.md` for coverage and gaps).
Defined the `Product`/`Category` TypeScript domain model (`src/types/`) and matching Mongoose
schemas (`src/models/`) with indexes, variants, and specifications support. Normalized supplier
categories into Renvura's own `electronics-gadgets` / `health-beauty` taxonomy
(`src/data/categories.ts`). Built the verified seed catalog (`src/data/products.ts`), a
data-access service layer (`src/services/products.ts`), validation (`src/lib/validate-product.ts`),
and BDT/slug/discount utilities (`src/utils/`). Copied production product photos into
`public/products/`.

**Not done in Phase 2** (deferred, per explicit scope): no MongoDB Atlas connection — the schemas
exist but nothing calls `mongoose.connect()` yet; data access reads `src/data/products.ts`
instead. `regularPrice`/`sellingPrice` are unset and every product's `status` is `"draft"` — the
business hasn't reviewed pricing or approved products for sale.

## Phase 3 — Global storefront design system ✅ (three passes)

**Pass 1 (initial build):** design tokens (colors, typography, shadows, container/section rhythm)
in `src/app/globals.css`, rethemeing HeroUI v3 via its CSS custom-property system. Built and wired
into every route via `StoreShell`: `AnnouncementBar`, sticky `Header` with desktop nav + inline
search, `MobileNav` drawer, `Footer`. Built the reusable storefront primitives: `ProductCard`,
`Price`, `Badges` (In Stock/Out of Stock/Sale — no fabricated "Best Seller"/"Trending" states),
`SearchBar` (UI only). Added a temporary `/ui-preview` route (noindex, on-page notice) to verify
all of this against real Phase 2 product data. Visual direction at this point: a navy/cream/gold
palette against an original (later-replaced) jewelry-site layout reference.

**Pass 2 (correction):** the user replaced `resources/reference-theme.png`/`.pdf` with a new
authoritative reference (a "TimTom"-style e-commerce homepage) and approved a new primary
storefront palette (indigo/slate/amber). This pass retinted the existing components' tokens —
palette only, no layout changes yet.

**Pass 3 (redesign):** the user rejected the palette-only correction as insufficient and required
the reference files to be treated as a literal **layout blueprint** — proportions, header/nav
structure, hero, grid density, card anatomy, footer structure reproduced closely, not just colors.
This pass rebuilt `Header`/`AnnouncementBar`/`Footer`/`ProductCard`, added `SecondaryNav` and
`NewsletterSignup`, and **explicitly pulled Phase 4 (Homepage) forward** into this same pass — see
below. See `docs/DESIGN-SYSTEM.md` §§2–9 for the full current state (this file doesn't restate
component-level detail that lives there).

**Not done in Phase 3** (deferred, per explicit scope, still true after all three passes): no real
search, cart, checkout, auth, admin, or MongoDB connection. Add to Cart is wired to real state
(disabled when unpriced/out of stock) but doesn't add anything anywhere yet. `/ui-preview` must be
removed or gated before production launch.

## Phase 4 — Homepage ✅ (initial build pulled into Phase 3's redesign pass; refined as its own pass)

Built using real Phase 2 product data and the Phase 3 primitives, following the reference's actual
section set rather than the originally-planned list below — see `docs/DESIGN-SYSTEM.md` §9 for
the full current section-by-section detail (this file doesn't restate it) and why some of the
originally-planned sections (Best Sellers, Trending Products, Customer Reviews) were renamed or
dropped: no sales/ranking/review data exists in the Phase 2 catalog to honestly support those
claims.

**Phase 4 refinement pass** (after the Phase 3 redesign, once the light premium palette was
finalized at `78ea72e`): audited `ProductCard`, Popular Products, and Featured Picks against this
phase's requirements and found them already compliant (no changes needed — real data, no dark
backgrounds, keyboard-accessible tabs/carousel controls, lightweight local-state filtering, no
global state). Added two new sections that were in the original planned list but hadn't been built
yet — **Category Highlights** (`src/components/home/CategoryHighlights.tsx`: a 2-column editorial
block, one card per top-level category, real product photography, a hand-authored truthful
sentence, and a CTA to the real category route) and **Why Shop With Renvura**
(`src/components/home/WhyShopWithRenvura.tsx`: a compact 4-item trust grid — Cash on Delivery,
Nationwide Delivery, Selected Products, Secure Ordering Experience — using three new hand-authored
icons in `src/components/ui/icons.tsx`, no new icon-library dependency). Added homepage-specific
SEO metadata (`title`/`description` export in `src/app/page.tsx`, overriding the root layout's
generic title). Reworded one `BrandStory` sentence that referenced "verified suppliers" — that's
an internal sourcing detail, not customer-facing positioning.

<details>
<summary>Original Phase 4 scope as planned before the redesign (kept for history)</summary>

Hero, Featured Products, Best Sellers, Shop by Category, Trending Products, Problem-Solving
Gadgets, Promotional Banner, Health & Beauty Feature, New Arrivals, Why Shop With Renvura,
Customer Reviews, Newsletter — built against real product data from Phase 2 using the Phase 3
`ProductCard`/`Price`/`Section`/`Container` primitives, not placeholders or new one-off styling.

</details>

## Phase 5 — Categories / product listing ✅
Built `/shop`, `/electronics-gadgets`, `/health-beauty` on one shared listing architecture — see
`docs/DESIGN-SYSTEM.md` §10 for full component/UI detail. `getProductListing()`
(`src/services/products.ts`) is the single place category filtering, search (title/model/category
name), sorting, and pagination happen, reused by all three routes so the logic isn't duplicated
per page. `ProductGrid` moved from `src/components/home/` to `src/components/ecommerce/` since
it's a generic reusable primitive, not homepage-specific.

**Data-driven filter/sort activation** (a rule worth calling out because it's not obvious from the
UI alone): every product in the Phase 2 catalog currently has `sellingPrice: null` and
`inventory.status: "in_stock"`. Price sort (`price-asc`/`price-desc`) and the "in stock only"
toggle are real, working code paths, but only render in the UI once the current result set
actually has variance to act on (`products.some(p => p.pricing.sellingPrice !== null)` /
`products.some(p => p.inventory.status === "out_of_stock")`) — so with today's data, `/shop` shows
only Featured/Name A–Z/Name Z–A sort and a category filter (the only two things that currently do
anything), and both price sort and the stock toggle will appear automatically, with no code
change, the moment real pricing or a real out-of-stock product exists. Filtering/sorting never
reads `pricing.wholesalePrice` — see CLAUDE.md.

Search is wired end-to-end: the header `SearchBar` (previously UI-only) now navigates to
`/shop?q=<term>` on submit; `ProductListingPage` runs the actual search server-side. All listing
state (`category`, `sort`, `q`, `availability`, `page`) lives in the URL — shareable, and no global
client state.

## Phase 6 — Product detail ✅
Built `/products/[slug]` — see `docs/DESIGN-SYSTEM.md` §11 for full component detail.
`generateStaticParams()` pre-renders all 21 real product pages at build time (static catalog, no
DB). Page order: breadcrumb → gallery + buy box → delivery/payment info → description/features/
specifications (plain stacked sections, each only rendered if that product actually has the field)
→ related products (`getRelatedProducts()` in `src/services/products.ts`: same subcategory → same
category → other `"active"` products as a dormant fallback, same "real code path, currently empty
until real data exists" pattern as Phase 5's price sort — every product is still `"draft"`).

**Gallery reality**: 20 of the 21 real products have exactly one image; only
`c16-ai-selfie-stick-gimbal` has two. `ProductGallery` renders no thumbnail strip/controls for a
single-image product, and one simple horizontal thumbnail row (not a desktop-column/mobile-row
split) when there's more than one — a fancier layout would be complexity with no real content to
justify it.

**Structured data**: Product JSON-LD is emitted per page, but the entire `offers` object — not
just the price field — is omitted whenever `sellingPrice` is `null` (true for every product today),
since a priceless `Offer` is itself a form of fabricated-looking data. `wholesalePrice` is never
read anywhere in this route, in the visible buy box or in JSON-LD.

**Not done in Phase 6** (deferred, per explicit scope): no real cart mutation, checkout, auth,
admin, MongoDB, payments, or tracking. Add to Cart / Buy Now / the quantity selector are UI
foundations only, disabled via the same real-state formula `ProductCard` already uses.

## Phase 7 — Cart + wishlist ✅
Built real client-side cart and wishlist state — see `docs/DESIGN-SYSTEM.md` §12 for full UI
detail. `CartContext`/`WishlistContext` (`src/contexts/`) each wrap a small module-level store
backed by `useSyncExternalStore` (not `useReducer`+`useEffect` — reading `localStorage` needs to be
hydration-safe, and `useSyncExternalStore` is React's own mechanism for that, not a
`useEffect`-based read-on-mount, which the project's React Compiler lint rule correctly flags as
an anti-pattern); item mutations still go through a plain reducer function internally. Persisted
to versioned `localStorage` keys (`renvura:cart:v1`, `renvura:wishlist:v1`) via
`src/lib/local-storage.ts`'s type-guarded safe read/write — corrupt or wrong-shape stored data is
discarded, never trusted.

**Untrusted client state**: cart/wishlist `localStorage` data is a **display convenience only**.
Phase 8's order creation must re-fetch and validate price/availability from real product data (or
a real backend) before creating an order — nothing client-side here is a source of truth for that.
`CartItem.sellingPrice` is only ever populated from a real, non-null `sellingPrice`; the `addItem`
reducer path defensively rejects `null`/invalid adds as a second line of defense beyond the UI's
own disabled-button gating. `wholesalePrice` is never read anywhere in this feature.

**Current price limitation**: every product in the real catalog still has `sellingPrice: null`, so
Add to Cart/Buy Now are correctly disabled everywhere today (verified live — all 18 rendered Add to
Cart buttons and both Buy Now buttons carry `disabled`/`data-disabled="true"`). Since no real
product can be added through the UI yet, the cart reducer itself was verified via a standalone
state-level test (add/duplicate-increment/maxQuantity-cap/remove/update-quantity/clear/itemCount/
subtotal — 12 checks, all passing) rather than an end-to-end UI click-through. The wishlist has no
such price gate and was verified fully end-to-end (toggle, persistence, `/wishlist` page).

## Phase 8 — Checkout + secure order creation ✅
Built `/checkout`, `/order-success/[orderNumber]`, `/track-order`, and the `createOrder`/
`trackOrder` Server Actions (`src/actions/orders.ts`) — see `docs/ARCHITECTURE.md`'s "Checkout &
order creation" section for the full security model and `docs/DESIGN-SYSTEM.md` §13 for UI detail.
MongoDB Atlas is connected for the first time (`src/lib/db.ts`, `src/models/Order.ts`) — product
data still reads `src/data/products.ts`.

**Core security property**: `createOrder` never trusts a client-submitted price, subtotal, or
total. Only `productId`/`quantity` come from the client cart; `recalculateOrder`
(`src/actions/order-logic.ts`) re-derives everything from the trusted server-side product catalog,
using the same purchasability formula (`sellingPrice !== null && status !== "out_of_stock"`)
already used by `ProductCard`/`BuyBox` — so Skin1004 100ml is correctly rejected here too, with no
special-casing. Delivery fee is computed server-side from the shipping district
(`src/utils/delivery.ts`). `wholesalePrice` is never read anywhere in this phase.

**Payment methods**: Cash on Delivery (no transaction ID, `cod_pending`) and manual bKash/Nagad/
Rocket (Transaction ID required, `pending_verification` — there is no payment gateway yet, so
nothing is ever marked `paid` automatically). Manual payment numbers come from
`NEXT_PUBLIC_BKASH_NUMBER`/`NEXT_PUBLIC_NAGAD_NUMBER`/`NEXT_PUBLIC_ROCKET_NUMBER`
(`src/config/payment.ts`); a method with no configured number renders disabled in the UI rather
than with a blank/fabricated number.

**Idempotency & abuse protection**: a client-generated `idempotencyKey` (unique-indexed on
`Order`) makes a double-submit safe — a repeat call with the same key returns the existing order
rather than creating a second one. A per-IP in-memory rate limiter
(`src/lib/rate-limit.ts`) guards both Server Actions; it's explicitly documented as process-local,
not a substitute for a distributed limiter in production. Payload limits: 30 unique items max, 20
per line, string-length caps on every text field (all enforced in `src/actions/order-schema.ts`).

**Order tracking**: `/track-order` looks up by order number + phone, returns the same generic "no
matching order" message whether the order doesn't exist or the phone is wrong — it can't be used
to enumerate either one. The response (`toTrackingSummary`) omits the Transaction ID and the full
address (division/district/upazila only), and never includes the Mongo `_id`.

**Delivery fee — business-approved**: `src/config/delivery.ts` (`DELIVERY_FEE_CONFIG_IS_FINAL =
true`): ৳80 inside Dhaka, ৳150 outside Dhaka, paid by the customer and added to the product
subtotal to produce the order total.

**Known limitation — no live database this session**: no `MONGODB_URI` was available while
building this phase. The DB-free core (`recalculateOrder` + the Zod schemas — the actual security
logic: purchasability, quantity limits, price recalculation, phone/division/payment validation)
was verified directly via an isolated script (20 checks, all passing — valid COD/bKash/Nagad/
Rocket inputs, missing transaction ID, invalid phone, empty cart, unknown product, excessive
quantity, over-limit item count, Skin1004 100ml rejection, inside/outside-Dhaka delivery fee,
invalid division). The DB-touching path (`createOrder`'s idempotency check, order-number
generation, insert; `trackOrder`'s lookup) is correct by code review and framework-standard
patterns, but wasn't exercised against a live database — the `try`/`catch` added around the whole
DB-touching span (so a connection failure degrades to a clean `{ ok: false }` instead of an
unhandled exception) was specifically added and confirmed necessary after that gap surfaced during
this session's testing. No browser automation was available either, so the checkout form's
client-side interactive states (payment-method disabled styling, inline field errors) were
verified by code review and compiled-CSS inspection, not a live click-through.

## Phase 9 — Authentication / customer accounts ✅
Built customer sign-up/sign-in/sign-out, a protected `/account` area, saved addresses, and order
history/detail — using Better Auth (email + password, extensible to social providers later) with
its MongoDB adapter, alongside the existing Mongoose connection. See `docs/ARCHITECTURE.md`'s
"Authentication & customer accounts" section for the full architecture and security model.

**Core security property, mirroring Phase 8's price-recalculation rule**: `customerUserId` on an
`Order` is always derived server-side from the session (`getCurrentUser()` in
`src/lib/auth-session.ts`) — never accepted from the client, and there's no field for it in
`order-schema.ts`'s input shape to even strip. The same applies to every address mutation
(`src/actions/addresses.ts`): `userId` always comes from the session, and update/delete/
set-default re-fetch the target scoped to `{ id, userId }` first — a cross-user attempt is treated
identically to "not found," never "forbidden" (which would itself leak that the resource exists).
Verified live with two real test accounts: cross-user address edit/delete/set-default and
cross-user order list/detail access were all correctly rejected, with the target address/order
unmodified in each case.

**Guest checkout is unaffected** — `CheckoutForm` renders identically to before when there's no
session (verified: a fresh guest COD order still produces `customerUserId: null`, the exact same
totals/statuses as Phase 8). Logged-in checkout additionally prefills Customer Information and
offers saved-address selection, never forces saving a new address, and never requires login to
order.

**Route protection is layered, not client-side-only**: `proxy.ts` does a fast, cookie-presence-only
redirect for `/account/*` (verified: no cookie → redirect; a forged/garbage cookie also → redirect,
since `proxy.ts` only checks presence); `src/app/account/layout.tsx` does the authoritative
`auth.api.getSession()` check behind it (verified: the forged-cookie case is caught here, not
silently let through). Every nested account page additionally re-derives data from the session
itself rather than trusting any route param.

**Deferred, per the brief's own preferred option**: historical guest-order linking (claiming past
guest orders by email) is *not* implemented — only orders placed while signed in get a
`customerUserId`; existing and future guest orders stay guest orders unless a customer is signed in
at checkout time. Also deferred: email verification (not required this phase — `autoSignIn: true`
means signup itself establishes a session), email change (kept read-only on the profile page — no
verified-change flow exists yet), and social/OTP login (architecture stays extensible via
`socialProviders`, per Better Auth's own config shape, but none are wired up).

**Known, documented limitation**: profile `phone` updates go through Better Auth's own
`authClient.updateUser()` directly (the correct, idiomatic way to mutate a custom
`additionalFields` entry) rather than a custom Server Action — this means BD phone-format
validation (`normalizeBdPhone`) only runs client-side for this one field, not server-side. This was
a deliberate, approved tradeoff (self-owned, low-stakes profile data, unlike order pricing which is
fully server-revalidated), confirmed live: bypassing the client and calling the raw endpoint
directly can store a non-BD-format phone string. Not a cross-user or security issue, but worth
knowing before treating this field as reliably normalized elsewhere.

## Phase 10 — Admin dashboard + store management ✅
Built a role-gated `/admin/*` dashboard: dashboard overview, order management (list/detail/status
workflow), manual-payment verification queue, product management (now MongoDB-backed CRUD),
category management, customer views, inventory (stock adjustment), homepage curation (featured
products, category highlight order), basic analytics, and store settings (delivery fees, support
contact, low-stock threshold). See `docs/ARCHITECTURE.md`'s "Admin dashboard & authorization"
section for the full architecture and security model, and CLAUDE.md's matching rules section.

**Core architectural decision**: the product/category catalog moved from static seed data
(`src/data/products.ts`/`categories.ts`) to MongoDB as part of this phase — the Phase 10 brief's
central risk (an admin CRUD UI editing data the storefront ignores) doesn't apply, because the
storefront and the admin dashboard now read the exact same `ProductModel`/`CategoryModel` records.
The static files remain as the original human-verified record; `scripts/seed-catalog.ts` performed
the one-time, idempotent migration.

**Authorization mirrors Phase 9's proven pattern exactly**: a `role` field on Better Auth's `user`
document (`input: false`, so no client-reachable API can set it), a manual-only bootstrap script
(`scripts/promote-admin.ts`), a layout-level `getCurrentUser()` + role check that renders
`notFound()` for a non-admin (never a 403), and every admin Server Action independently calling
`requireAdmin()` again rather than trusting the layout ran.

**Revenue/analytics numbers are deliberately conservative** rather than counting every pending
order — see `getOrderDashboardStats`/`getAverageOrderValue`/`getSalesByDay` in
`src/services/orders.ts`. An audit trail (`AdminAuditLog`) records every order-status change,
payment verification, and product/category/inventory/homepage/settings write.

**Verification**: `tsc --noEmit`, `eslint`, and `next build` all pass clean. No automated test
suite exists in this repo (no Jest/Vitest/Playwright configured), so authorization and mutation
correctness were verified by code review plus manual/browser checks, not committed test files —
see `docs/ARCHITECTURE.md`'s "Known limitations" for what that leaves untested going forward.

**Deferred, matching the brief's own explicit scope**: automated payment gateway integration,
courier API integration, Meta Pixel/CAPI/GA4, advanced CRM, supplier API, complex warehouse
management, multi-vendor support, advanced accounting, "log in as customer" impersonation, product
image upload UI (image/thumbnail fields are text paths under `/products/`, no upload
infrastructure), and bulk product import/export.

## Phase 10.5 — Customer verification & account recovery ✅
Final scope, after a mid-phase business-decision change: Better Auth `email-otp`-backed email
verification, a self-serve forgot/reset password flow (`/verify-email`, `/forgot-password`,
`/reset-password`), a production Resend integration, and a new order-confirmation email.
**Checkout phone OTP was built and tested, then explicitly deferred** in favor of manual
phone/WhatsApp order confirmation — see below. See `docs/ARCHITECTURE.md`'s "Customer verification
& account recovery" section for the full architecture, and CLAUDE.md's matching rules section.

**Phone OTP: built, then removed.** The first pass of this phase implemented a complete
session-independent phone-OTP system — deliberately *not* Better Auth's `phone-number` plugin
(tracing `node_modules/better-auth/dist/plugins/phone-number/routes.mjs` showed its
`/phone-number/verify` endpoint requires or fabricates a `user` document, a non-starter for guest
checkout) but a small dedicated `CheckoutPhoneVerification` collection plus two Server Actions
instead, producing an opaque, single-use, exact-phone-matched proof token independently
re-validated by `createOrder`. It passed lint/typecheck/build and was verified against the real
database (replay rejection, wrong-phone rejection, expiry, unverified-challenge rejection). Before
shipping, the business decided no SMS provider would be selected for launch — Renvura confirms
orders manually by phone/WhatsApp instead, using the existing Phase 10 admin order-status workflow
(`pending` → `confirmed`/`cancelled`, no new admin code needed). All phone-OTP code (`Checkout
PhoneVerification` model, `phone-verification` service/actions, `PhoneVerificationSection` UI,
`sms-provider.ts`) was removed from the working tree rather than left dormant, and `order-schema.ts`/
`createOrder` reverted to their pre-phone-OTP shape (phone is normalized/validated, never proven).

**Email verification and password reset** fit Better Auth's `email-otp` plugin cleanly (no
guest-checkout conflict) and shipped unchanged from the first pass — zero custom token storage.

**Resend added as the production transactional email provider**, replacing the earlier
provider-agnostic placeholder. One central module (`src/lib/email-provider.ts`) is the only file
that imports `resend`; `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`/`EMAIL_REPLY_TO` configure it — none
set yet, so real delivery fails closed in production and logs to the console in development.

**New: order-confirmation email.** After a successful, newly-created order (never on an idempotent
replay), `createOrder` schedules `sendOrderConfirmationEmail` via Next's `after()` so a slow/failed
send can never affect the order-placement response — order persistence is authoritative and never
rolled back for an email outcome. Optional (only sent when the customer supplied an email; absence
is not an error), guest and logged-in alike. Built entirely from the sanitized `OrderSummary`
projection (no `wholesalePrice`/Mongo `_id`/`idempotencyKey`/internal fields reachable). Subject is
always "Renvura Order Received — {orderNumber}" — never "confirmed," since every order starts and
stays `pending` until a human confirms it. `Order.notifications.orderConfirmationEmail` records the
one attempt's outcome (`not_applicable`/`pending`/`sent`/`failed` + `sentAt`/`providerMessageId`/
`lastError`) for admin visibility; the actual once-only guarantee is structural (only the
fresh-insert branch of `createOrder` ever schedules the send), not driven by checking that field.

**No existing account was retroactively marked verified.** Turning on
`requireEmailVerification` only changes what's enforced going forward — pre-Phase-10.5 accounts
verify once on their next sign-in via the same Resend flow any unverified account gets, matching
this project's standing "never fabricate data" rule.

**Verification**: `tsc --noEmit`, `eslint`, and `next build` all pass clean. As with Phase 10, no
automated test suite exists in this repo — verification was code review plus manual/HTTP-level
checks against the real database (signup → `emailVerified:false`/no session, unverified login →
`403 EMAIL_NOT_VERIFIED`, forgot-password → identical generic response for a real vs. nonexistent
email), plus a regression pass over Phase 8–10 checkout/admin behavior and a client-bundle scan for
leaked secrets.

**Deferred**: checkout phone OTP (revisit once a real SMS provider is chosen — do not resurrect the
removed code without designing against that provider's actual API), account phone-update
verification (the existing unverified `ProfileForm.tsx` phone field is unchanged), in-app email
*change* (only verification was in scope), social/OTP sign-in, full 2FA, and an automated
email-retry/queue system for a failed order-confirmation send.

## Phase 11 — Analytics & measurement ✅
Meta Pixel (browser), Meta Conversions API (server), and GA4 — event wiring for PageView/page_view,
ViewContent/view_item, Search/search, AddToCart/add_to_cart, AddToWishlist/add_to_wishlist,
view_cart (GA4 only — Meta has no standard "ViewCart" event), InitiateCheckout/begin_checkout, and
Purchase/purchase. See `docs/ARCHITECTURE.md`'s "Marketing / tracking (Phase 11)" section and
CLAUDE.md's "Analytics & measurement (Phase 11)" section for the full architecture.

**Centralized, not scattered.** Every `fbq()`/`gtag()`/Meta Graph API call lives in
`src/lib/analytics/` (`config.ts`, `event-types.ts`, `event-id.ts`, `normalization.ts`,
`mapping.ts`, `meta-client.ts`, `ga4-client.ts`, `meta-server.ts`) — components import `track*`
helper functions, never touch `window.fbq`/`window.gtag` directly. `AnalyticsScripts.tsx` (Server
Component, loads the Pixel/gtag.js base snippets) and `RouteTracker.tsx` (Client Component, fires
PageView/page_view on client-side route changes) mount once in the root layout without making it
dynamic — `/` and `/products/[slug]` remain statically prerendered, confirmed via `next build`'s
route output.

**`event_id` deduplication is Purchase-only** — no other event has a server CAPI counterpart in
this phase. `purchaseEventId(orderNumber) = "purchase:{orderNumber}"` (deterministic, never a
timestamp, never the Mongo `_id`) is computed identically by the server (`scheduleMetaPurchaseCapi`
in `src/actions/orders.ts`, scheduled via `after()` from the exact same genuinely-new-order call
site as the Phase 10.5 order-confirmation email — same idempotency guarantee, same never-block/
never-rollback principle) and the browser (`PurchaseTracker.tsx` on `/order-success/[orderNumber]`,
fed only a small sanitized prop shape from the server-rendered order, never `localStorage`).
`Order.analytics.metaPurchase` (`{status, eventId, sentAt}`) mirrors `notifications.
orderConfirmationEmail`'s existing pattern exactly, for admin visibility only.

**Purchase value = final order total including delivery fee**, for both providers — GA4 separately
reports `shipping: deliveryFee` as a breakout of that same total; Meta's schema has no distinct
shipping field. Never `wholesalePrice`/profit.

**PII protection**: PageView/page_view URLs are pathname-only (`RouteTracker.tsx` never reads
`useSearchParams()`), so `/verify-email?email=...`/`/reset-password?email=...` and any other
query-string PII never reaches Meta or GA4. Meta CAPI's `user_data` sends only SHA-256-hashed
email/phone (`normalization.ts`, lowercase+trim / `normalizeBdPhone` → `8801XXXXXXXXX` before
hashing) — never raw. GA4 never receives email, phone, name, or address. Neither provider ever
receives `wholesalePrice`, a payment Transaction ID, or admin notes.

**Analytics-disabled by default until configured, never commerce-critical.** With no Meta Pixel
ID/GA4 Measurement ID/CAPI token set, `AnalyticsScripts.tsx` renders nothing and every `track*`
call silently no-ops — checkout, auth, and the rest of the site are completely unaffected. Locally,
analytics additionally requires `NEXT_PUBLIC_ANALYTICS_ENABLED=true` even with an ID present, so
`npm run dev` never pollutes real Meta/GA4 data.

**Privacy Policy updated** to accurately describe Meta Pixel/CAPI and GA4, `_fbp`/`_fbc` cookies,
and the hashed-contact-data CAPI matching — no Bangladesh-specific consent banner was built (none
identified as legally required), but `isAnalyticsConsentGranted()` is factored out as a single gate
function specifically so a real consent flow can replace it later without touching any event
call site.

**Verification**: `tsc --noEmit`, `eslint`, and `next build` all pass clean; `next build`'s route
output confirms the homepage and product pages stayed statically prerendered. No Meta Pixel ID,
Meta CAPI access token, or GA4 Measurement ID is configured yet, so real Meta/GA4 delivery is
unverified in this pass — see the environment variables table in `docs/ARCHITECTURE.md`.

**Explicitly not built**: Google Ads conversion tracking, TikTok Pixel, Microsoft Ads, email
marketing automation, CRM integrations, courier integration, an automated payment gateway, an
attribution platform, server-side GTM, and Meta refund/cancellation attribution.

## Phase 12 — Production order operations & customer lifecycle ✅
Full production order-management workflow: canonical status flow with server-enforced,
compare-and-swap transitions; order confirmation method (phone/WhatsApp), cancellation, and return
handling with fixed internal reason codes; inventory reservation (decrement at `confirmed`,
restore on cancellation/resellable return) with a new append-only `InventoryMovement` audit
ledger; courier readiness fields (no courier API integration); status-change customer emails
(confirmed/shipped/delivered/cancelled/returned); a shared customer-safe order-status timeline for
`/track-order` and `/account/orders/[orderNumber]`; a redesigned admin order-detail action UI
(`OrderStatusActions`, replacing the old status dropdown); admin quick-status tabs; COD quality
metrics (confirmation/delivery/cancellation rates) on `/admin/analytics`; and documentation of
recommended Meta Custom Audiences / GA4 Audiences for retargeting (no application code — pure
Ads-Manager/GA4-configuration guidance). See CLAUDE.md's "Order operations & customer lifecycle
(Phase 12)" section and `docs/ARCHITECTURE.md`'s matching section for the full architecture.

**Inventory strategy decision**: reserve/decrement at `confirmed`, not at order creation — most
`pending` COD orders are unconfirmed and some are never genuine, so decrementing at creation would
tie up stock for orders that may never ship. Exactly-once guarantee comes from the order-status
transition graph being a strict DAG (no status is ever revisited) combined with a real
compare-and-swap on `updateOrderStatusForAdmin` — no separate idempotency flag was needed.

**Payment coordination**: the one automatic payment-status change in the whole system is
`cod_pending → paid` when a COD order is marked `delivered` (cash was collected at the door).
Every manual-payment (bKash/Nagad/Rocket) transition — verify, fail, refund — stays a deliberate,
separate admin action; nothing here auto-verifies or auto-refunds a manual payment.

**Retargeting is documentation, not new tracking code.** Phase 11's Meta Pixel/CAPI + GA4 events
are completely unchanged (regression-verified — zero files in `src/lib/analytics/`/
`src/components/analytics/` were touched this phase). Confirming/shipping/delivering an order
never fires a second Purchase event or any other CAPI/Pixel/GA event.

**Explicitly not built**: courier API integration (schema/UI readiness only), bulk admin order
actions (single-order transitions only, for now), automatic manual-payment refunds, Google Ads/
TikTok/Microsoft Ads audience sync, GA4-Google-Ads account linking.

## Phase 13 — Courier / fulfillment integration ✅
Provider-neutral courier abstraction (`src/lib/courier/`) with a controlled `CourierProviderId`
enum (`pathao`/`steadfast`/`redx`/`paperfly`/`other`) replacing the old free-text
`Order.courier.provider`, plus real (though credential-gated and unverified against official
docs — see below) Pathao and Steadfast adapters, a manual/label-only adapter for RedX/Paperfly/
Other, and a dev-only mock provider. `Order.courier` extended with `providerId`/`mode`/
`creationStatus`/`creationError`/`normalizedStatus`/`rawStatusCode`/`shipmentCreatedAt`/
`lastSyncedAt`/`externalOrderId` (all admin-only diagnostics — `CustomerOrderCourier` narrows to
the same customer-safe fields Phase 12 already exposed, plus a friendly `normalizedStatus` label).
Idempotent shipment creation via a `courier.creationStatus` compare-and-swap
(`src/services/courier.ts`); a new admin `CourierPanel` (separate from — and decoupled from —
`OrderStatusActions`'s "Mark Shipped" transition, since creating a consignment is not the same
fact as the order having physically shipped) offering "Create Shipment" only for a provider that's
both API-capable and currently configured, falling back to manual tracking entry otherwise; a new
`CourierLocationMapping` model for Pathao's city/zone/area ID requirement (starts empty — no
mapping is ever guessed); a new `Product.inventory.shippingWeightGrams` field (also empty for
every existing product — real courier weight is a real blocker, tracked in CLAUDE.md's "Known
Phase 13 limitations," not silently defaulted). See CLAUDE.md's "Courier / fulfillment integration
(Phase 13)" section and `docs/ARCHITECTURE.md`'s matching section for the full architecture.

**Neither provider's official API documentation could be verified** — both are gated behind a
merchant-account login this project doesn't have (confirmed directly: Pathao's own public help
article points only to its merchant dashboard's "Developer API" section; Steadfast's docs live
behind their merchant portal). Both adapters are built from cross-referenced third-party/community
sources, clearly flagged unverified in-file, and gated behind real env credentials that are absent
in this environment — so nothing in either adapter has ever made a real network call. **Real
Pathao/Steadfast delivery is unverified.**

**Webhooks were not implemented** — Phase 13's own safety rule ("if official webhook security
can't be verified, don't activate webhook writes") applies for the same reason the adapters are
unverified. Status sync is manual-refresh only (`adminRefreshCourierStatus`), and deliberately
never auto-transitions `orderStatus`/inventory/payment — those stay entirely inside Phase 12's
already-validated, CAS-protected lifecycle.

**Explicitly not built**: webhook endpoints, automatic order-status sync from courier status,
courier consignment cancellation, bulk shipment creation, a real (non-empty) Pathao location-ID
mapping table, real product shipping weights, Core Web Vitals pass, automated test coverage.

## Phase 14 — Deployment
Production Vercel deployment, environment configuration, domain setup, monitoring.
