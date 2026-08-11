# Architecture

Status: **Phase 8 — Checkout + secure order creation**. This document describes the architecture
put in place so far, and the architecture the codebase is being kept ready for. See
`docs/PRODUCT-ROADMAP.md` for phasing, `docs/PRODUCT-DATA.md` for the extracted catalog, and
`docs/DESIGN-SYSTEM.md` for the visual/component system itself.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Turbopack by default; see `AGENTS.md` / `CLAUDE.md` for version-16-specific behavior |
| Language | TypeScript (strict) | |
| UI library | React 19 | |
| Styling | Tailwind CSS v4 | CSS-first config in `src/app/globals.css`, no `tailwind.config.js` |
| Component kit | HeroUI v3 (`@heroui/react`, `@heroui/styles`) | React Aria based; no context provider required |
| Theme | `next-themes` | class-based light/dark, see `src/components/layout/providers.tsx` |
| Data layer | MongoDB Atlas + Mongoose | `Order` is connected as of Phase 8 (`src/lib/db.ts`); `Product`/`Category` schemas still exist but aren't wired up — product data access still reads `src/data/products.ts` |
| Mutation layer | Next.js Server Actions | `src/actions/orders.ts` (`createOrder`, `trackOrder`) — chosen over Route Handlers since no API surface existed yet and Server Actions are the idiomatic Next 16 fit for form mutations from Client Components; Route Handlers remain an option for a future non-mutation/external-consumer API |
| Validation | Zod | `src/actions/order-schema.ts` — the first genuinely untrusted-network-input case in this codebase (see `src/lib/validate-product.ts`'s doc comment, which deliberately skipped Zod for trusted seed data) |
| Hosting | Vercel | |
| Source control | Git / GitHub | `masumgaibandha/renvura-dropshipping` |

## Folder structure

```
renvura-dropshipping/
├── assets/                  Official Renvura brand source files (read-only)
├── resources/                Reference theme + supplier product source material (read-only)
│   ├── reference-theme.png     Authoritative layout blueprint (Phase 3 redesign) — see
│   ├── reference-theme.pdf       docs/DESIGN-SYSTEM.md §2. Never modify these files.
│   └── products/
│       ├── electric-product/product-01..10/
│       └── health-beauty/product-01..11/
├── docs/                      This documentation set
├── public/
│   ├── brand/                 Production copies of assets/ (same filenames)
│   └── products/               Production copies of product photos (NOT supplier screenshots),
│                                 under <category-slug>/<product-slug>/, e.g.
│                                 electronics-gadgets/x699-turbo-fan/image-1.jpg
├── src/
│   ├── app/                    App Router routes, layouts, metadata
│   │   ├── page.tsx               Homepage (Phase 4) — see docs/DESIGN-SYSTEM.md §9
│   │   ├── shop/                   All-products listing (Phase 5) — see docs/DESIGN-SYSTEM.md §10
│   │   ├── electronics-gadgets/    Category listing — same shared architecture as /shop
│   │   ├── health-beauty/          Category listing — same shared architecture as /shop
│   │   ├── products/[slug]/        Product detail (Phase 6) — see docs/DESIGN-SYSTEM.md §11
│   │   ├── cart/                   Cart page (Phase 7) — see docs/DESIGN-SYSTEM.md §12
│   │   ├── wishlist/               Wishlist page (Phase 7) — see docs/DESIGN-SYSTEM.md §12
│   │   ├── checkout/                Checkout (Phase 8) — see docs/DESIGN-SYSTEM.md §13
│   │   ├── order-success/[orderNumber]/  Post-order confirmation (Phase 8) — see docs/DESIGN-SYSTEM.md §13
│   │   ├── track-order/              Order tracking lookup (Phase 8) — see docs/DESIGN-SYSTEM.md §13
│   │   └── ui-preview/           TEMPORARY design-system preview route — see docs/DESIGN-SYSTEM.md §7
│   ├── components/
│   │   ├── ui/                  icons.tsx, IconLinkButton.tsx, Breadcrumbs.tsx — small generic primitives
│   │   ├── layout/               Container, Section, AnnouncementBar, Header, SecondaryNav, Footer,
│   │   │                          NewsletterSignup, StoreShell, NavLinks, MobileNav, providers
│   │   ├── ecommerce/            ProductCard, ProductGrid, Price, Badges, SearchBar — generic
│   │   │                          reusable primitives (no cart/search business logic)
│   │   ├── home/                  Homepage-composition components (not generic/reusable across
│   │   │                            pages): HeroBanner, CategoryTabs, FeaturedProductsRow,
│   │   │                            CategoryHighlights, WhyShopWithRenvura, BrandStory — see
│   │   │                            docs/DESIGN-SYSTEM.md §9
│   │   ├── shop/                   Listing-page composition (Phase 5): ProductListingPage,
│   │   │                            SortSelect, MobileFilterDrawer — see docs/DESIGN-SYSTEM.md §10
│   │   ├── product/                Product-detail-page composition (Phase 6): ProductGallery,
│   │   │                            BuyBox, QuantitySelector, DeliveryPaymentInfo, ProductDetails —
│   │   │                            see docs/DESIGN-SYSTEM.md §11
│   │   ├── cart/                   Cart composition (Phase 7): AddToCartButton, CartIcon,
│   │   │                            CartCountBadge, CartDrawer — see docs/DESIGN-SYSTEM.md §12
│   │   ├── wishlist/                Wishlist composition (Phase 7): WishlistToggleButton,
│   │   │                             WishlistCountBadge, WishlistGrid — see docs/DESIGN-SYSTEM.md §12
│   │   └── checkout/                 Checkout composition (Phase 8): CheckoutForm,
│   │                                  CustomerInfoSection, DeliveryAddressSection,
│   │                                  PaymentMethodSection, OrderSummary, TrackOrderForm — see
│   │                                  docs/DESIGN-SYSTEM.md §13
│   ├── actions/                    Server Actions (Phase 8, "use server"): orders.ts
│   │                                 (createOrder, trackOrder), order-schema.ts (Zod), order-logic.ts
│   │                                 (DB-free validate-and-recalculate — the security-critical part)
│   ├── config/                    brand.ts, navigation.ts, delivery.ts, payment.ts, address.ts (Phase 8)
│   ├── contexts/                   CartContext.tsx, WishlistContext.tsx (Phase 7) — guest cart/
│   │                                 wishlist state; see the untrusted-client-state note below
│   ├── data/                       categories.ts, products.ts — verified seed data (Phase 2)
│   ├── hooks/                      Client-side React hooks
│   ├── lib/                         Framework-agnostic utilities (validate-product.ts,
│   │                                  local-storage.ts, rate-limit.ts), db.ts (MongoDB connection,
│   │                                  Phase 8)
│   ├── models/                       Mongoose schemas: Product.ts, Category.ts (not yet connected),
│   │                                   Order.ts (connected, Phase 8)
│   ├── services/                      Data-access layer: products.ts (reads src/data/ for now),
│   │                                    orders.ts (MongoDB-backed, Phase 8)
│   ├── types/                          product.ts, category.ts, cart.ts, order.ts — shared
│   │                                    TypeScript domain types
│   └── utils/                          currency.ts, slug.ts, pricing.ts, phone.ts, delivery.ts —
│                                        small pure helpers
├── CLAUDE.md
└── package.json
```

**Layering rule:** UI components render data; `services/` contains business logic and talks to
`models/`; `lib/` holds framework-agnostic helpers (formatting, DB connection, etc.) that both
layers can use. `src/actions/orders.ts` (Server Actions) calls into `services/orders.ts`, not
`models/Order.ts` directly — the same rule a future Route Handler would follow.

## Rendering strategy

- Server Components by default everywhere. `"use client"` is added only where a component needs
  interactivity, browser APIs, or client-only hooks (e.g. `next-themes`' `ThemeProvider`, cart/
  wishlist widgets, forms).
- Data fetching happens in Server Components / Route Handlers, not client-side `fetch` where
  avoidable.

## Data model

### Product & Category (Phase 2 — done)

`src/types/product.ts` and `src/types/category.ts` define the domain model; `src/models/Product.ts`
and `src/models/Category.ts` define the matching Mongoose schemas (not yet connected to a
database — see below). Key shape decisions:

- `Product.pricing` separates `wholesalePrice` (what the supplier charges — the verified,
  extractable number) from `regularPrice`/`sellingPrice` (customer-facing prices the business
  hasn't set yet, so they're `null` rather than guessed). `discountPercentage` is derived, not
  stored as a source fact — see `calculateDiscountPercentage` in `src/utils/pricing.ts`.
- `Product.bulkPricing` captures quantity-break tiers only where the source clearly shows them
  (about half of the electronics catalog).
- `Product.category`/`subcategory` are slugs into `src/data/categories.ts`, not free text.
- Product provenance (which source folder/screenshot/images a record came from, and any data
  quality caveats) is modeled separately as `ProductSourceProvenance`/`VerifiedProductRecord` in
  `src/types/product.ts` — it lives in the seed data (`src/data/products.ts`), not in the
  `Product` shape itself, so the public product model stays clean once this becomes an API
  response shape.
- The Mongoose `Product` schema indexes `slug` (unique), `sku` (sparse — many source products
  don't have a confirmed SKU yet... actually all 21 currently do, but the schema doesn't assume
  that will always be true), and `category`/`subcategory`/`status`/`tags`.

**Not yet implemented**: `Customer` (guest + registered — Phase 9), `Review`, `Coupon`. These will
follow the same "only model what's needed, don't invent fields ahead of need" approach in later
phases.

### Order (Phase 8 — done, MongoDB-connected)

`src/types/order.ts` defines the domain model; `src/models/Order.ts` defines the matching Mongoose
schema, connected via `src/lib/db.ts`. Shape: BD address (division/district/upazila/addressLine),
`items[]` as denormalized **snapshots** (`titleSnapshot`/`imageSnapshot`/`unitPrice` captured at
order time, so a historical order stays readable even if the product catalog changes later),
`pricing` (`subtotal`/`deliveryFee`/`total`, all server-computed), `payment`
(`method`/`transactionId`/`status`), a customer-facing `orderNumber` (never the Mongo `_id`), and an
`idempotencyKey` (unique-indexed) that prevents a double-submit from creating two orders.
`wholesalePrice` never appears anywhere in this schema — `unitPrice` is always the real
`sellingPrice` at order time. See "Checkout & order creation" below for the full security model.

### Data access — seed data for products, MongoDB for orders

Product data access still reads directly from `src/data/products.ts` (the verified catalog
extracted in Phase 2 — see `docs/PRODUCT-DATA.md`); `src/models/Product.ts`/`Category.ts` exist but
aren't connected. The service functions (`getProductBySlug`, `getProductsByCategory`, etc.) are
written so that swapping the implementation to query `ProductModel` later doesn't require changing
any caller. **Orders are the first real MongoDB-backed data** (Phase 8) — `src/services/orders.ts`
is the only place that queries `OrderModel` directly, via the cached connection helper in
`src/lib/db.ts` (`connectToDatabase()` — reuses one connection across dev hot-reloads and
serverless invocations, throws a clear error if `MONGODB_URI` is unset, never logs the URI).

## UI component layer (Phase 3 — done; homepage added in the Phase 3 redesign)

`src/app/layout.tsx` wraps every route in `StoreShell` (`AnnouncementBar` → `Header` →
`SecondaryNav` → `<main>` → `Footer`), so individual pages never re-declare site chrome — a page
component only needs to return its own content. Full rules and rationale for each piece are in
`docs/DESIGN-SYSTEM.md`; the architectural point here is the client/server split:

- Client Components are each for a concrete, stated reason: `SearchBar.tsx` (real navigation to
  `/shop?q=...`, plus `useSearchParams()` to prefill — wrapped in its own `<Suspense>` boundary
  since it renders on every route including statically-prerendered ones) /
  `NewsletterSignup.tsx` (real form, `preventDefault`, no backend yet), `MobileNav.tsx`/
  `MobileFilterDrawer.tsx`/`CartDrawer.tsx` (shared drawer open/close state), `NavLinks.tsx`
  (`usePathname()`-driven active link styling), `providers.tsx` (theme + cart + wishlist context),
  `CategoryTabs.tsx`/`FeaturedProductsRow.tsx` (HeroUI `Tabs` selection state / a scroll-ref for the
  prev-next carousel), `SortSelect.tsx` (`router.push` on a native `<select>`'s `onChange` — the
  only navigation a `<select>` can't do with a plain `href`), `ProductGallery.tsx`/
  `QuantitySelector.tsx` (active-thumbnail state / a controlled quantity value), and (Phase 7)
  `AddToCartButton.tsx`/`WishlistToggleButton.tsx`/`CartIcon.tsx`/`CartCountBadge.tsx`/
  `WishlistCountBadge.tsx`/`BuyBox.tsx`/`/cart`/`/wishlist` (real cart/wishlist mutations and
  live counts — `BuyBox` graduated from Server to Client Component in Phase 7 specifically to
  coordinate its quantity value with the Add to Cart/Buy Now handlers; `/cart`/`/wishlist` are
  Client Components outright since their data is 100% client-only state, nothing to fetch
  server-side). Everything else — `Header`, `Footer`, `SecondaryNav`, `ProductCard`, `ProductGrid`,
  `Price`, `Badges`, `AnnouncementBar`, `Container`, `Section`, `IconLinkButton`, `Breadcrumbs`,
  `HeroBanner`, `BrandStory`, `ProductListingPage`, `DeliveryPaymentInfo`, `ProductDetails` — is a
  Server Component, even where it renders HeroUI components that are themselves Client Components
  internally (Next.js allows a Server Component to import and render a Client Component directly;
  the boundary starts at the child, not the parent).
- `ProductCard`/`Price`/`Badges` read the real `Product` type from Phase 2 and render nothing
  they can't verify (no ratings, no invented badges, "Price unavailable" instead of showing
  `wholesalePrice` as if it were a customer price). Add to Cart is disabled based on real state
  (`sellingPrice === null` or out of stock), not stubbed with a fake handler; the reducer behind it
  (`src/contexts/CartContext.tsx`) enforces the same rule as a second line of defense, so an
  invalid cart line can't be constructed even by a mis-wired caller.
- **Client cart/wishlist state is untrusted** (Phase 7): `localStorage`-persisted cart/wishlist
  data is a display convenience only, never a source of truth. As of Phase 8, `createOrder`
  actually enforces this — see "Checkout & order creation" below — nothing in
  `CartContext`/`WishlistContext` is ever trusted directly for an order.
- HeroUI is rethemed via CSS custom properties in `src/app/globals.css` (see
  `docs/DESIGN-SYSTEM.md` §3), not forked or wrapped — `Button`, `Chip`, `SearchField`, `Drawer`,
  `Dropdown`, `Tabs`, `TextField`/`Input` are used directly from `@heroui/react` throughout.

## Checkout & order creation (Phase 8)

`/checkout` (`CheckoutForm.tsx`) collects customer info, a BD address, and a payment method
client-side, but **never** submits its own computed prices as authoritative. `createOrder`
(`src/actions/orders.ts`, a Server Action) is the single trust boundary:

1. Zod-validates the raw input shape (`order-schema.ts`) — phone normalized to `01XXXXXXXXX`
   (`src/utils/phone.ts`), division restricted to the real 8-division enum
   (`src/config/address.ts`), `transactionId` conditionally required for bKash/Nagad/Rocket.
2. Only `productId`/`quantity` pairs are taken from the client cart — never a price, subtotal, or
   total.
3. `recalculateOrder` (`src/actions/order-logic.ts`) re-fetches each product from the trusted
   server-side catalog (`src/services/products.ts`), rejects the whole order if any product is
   missing or fails the same purchasability formula used everywhere else in the app
   (`sellingPrice !== null && status !== "out_of_stock"` — this is what makes Skin1004 100ml
   correctly un-orderable), validates quantity against a hard cap and, when known, real stock, and
   recomputes `subtotal`/`deliveryFee`/`total` from scratch. This function deliberately has no
   MongoDB dependency, so it can be exercised by an isolated script without a live database — see
   "Testing" in `docs/PRODUCT-ROADMAP.md`'s Phase 8 entry.
4. An `idempotencyKey` (client-generated once per checkout session, unique-indexed on `Order`)
   makes a double-submit or client retry a safe no-op — a prior successful call with the same key
   returns the same order instead of creating a second one; a same-key insert race is caught and
   resolved by re-fetching rather than erroring.
5. A per-IP in-memory rate limiter (`src/lib/rate-limit.ts`) guards both `createOrder` and
   `trackOrder`. It's explicitly **process-local** — doesn't coordinate across serverless
   instances or survive a redeploy — real production abuse protection needs a distributed store
   (Upstash Redis, Vercel's Web Application Firewall, etc.) in front of or instead of this.
6. Every step from the idempotency check onward runs inside one `try/catch`, so a database failure
   at any point degrades to a clean `{ ok: false }` result the UI can show, never an unhandled
   exception.

`/order-success/[orderNumber]` and `/track-order` both read through sanitized projections
(`toOrderSummary`/`toTrackingSummary` in `src/services/orders.ts`) — no Mongo `_id`, no
`idempotencyKey` ever leaves the server; the tracking projection additionally omits
`transactionId` and the full address (division/district/upazila only). `trackOrder` returns the
same generic "no matching order" message whether the order number doesn't exist or the phone
doesn't match, so it can't be used to enumerate either one.

**Delivery fee — not yet business-approved.** `src/config/delivery.ts` ships round placeholder
amounts (৳70 inside Dhaka / ৳130 outside Dhaka) behind an explicit
`DELIVERY_FEE_CONFIG_IS_FINAL = false` flag. These must be replaced with real, approved figures
before production use — see CLAUDE.md.

## Bangladesh-specific concerns baked into the architecture

- Currency formatting centralized (via `src/config/brand.ts` currency config) rather than
  hardcoded `$`/`৳` strings scattered through components.
- Address model is Division (real 8-value enum, `src/config/address.ts`) → District → Upazila/
  Thana (free text — no invented district/upazila mapping) → Area/Road/House, not a generic
  street/city/state/zip shape.
- Delivery pricing has a Dhaka vs. outside-Dhaka branch (`src/utils/delivery.ts`), computed
  server-side in `createOrder` — see "Checkout & order creation" above.
- Cash on Delivery is a first-class payment method (`cod_pending` from creation), not an edge case
  bolted onto an online-payment-first flow; bKash/Nagad/Rocket are manual (no payment gateway yet)
  and land in `pending_verification` until a human confirms the Transaction ID.

## Marketing / tracking readiness

Pixel/GA4/GTM integration and the internal order-lifecycle events
(`order_created` → `order_confirmed` → `supplier_submitted` → `shipped` → `delivered` /
`cancelled` / `returned`) are not implemented yet, but the service-layer split above is what makes
them addable later without rewiring UI: events fire from `services/`, not from components.

## SEO readiness

Next.js Metadata API is already in use for base metadata (`src/app/layout.tsx`), per-route
metadata on the homepage and the three Phase 5 listing routes, and now dynamic per-product
metadata (`generateMetadata()` in `src/app/products/[slug]/page.tsx`) plus Product JSON-LD as of
Phase 6 — truthful titles/descriptions throughout, `alternates.canonical` pointing at the clean
query-free path. Canonical URLs, OG image resolution, and the root layout's `metadataBase` are all
gated behind `isConfigured(brand.urls.site)` — wired, but inactive until a real production domain
replaces that `TODO`. `sitemap.ts`, `robots.ts`, and any SEO work beyond individual-route metadata
are still Phase 12 work, but nothing in the current structure blocks adding them later.

## Environment variables (Phase 8)

Never committed — `.gitignore` blocks all `.env*`, so these are documented here and in CLAUDE.md
instead of a checked-in `.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | Yes, for any order-touching code path | Server-only, never sent to the client, never logged. `connectToDatabase()` throws a clear error if unset. |
| `MONGODB_DB_NAME` | No | Passed to `mongoose.connect()`'s `dbName` option if set. |
| `NEXT_PUBLIC_BKASH_NUMBER` | No, but bKash is disabled in checkout until set | Public by design — the customer must see it to send a manual payment. |
| `NEXT_PUBLIC_NAGAD_NUMBER` | No, same as above | |
| `NEXT_PUBLIC_ROCKET_NUMBER` | No, same as above | |

## Explicitly deferred (not built yet)

The homepage was built ahead of schedule in the Phase 3 redesign, catalog/category listing
(`/shop`, `/electronics-gadgets`, `/health-beauty`) is done as of Phase 5, the product detail page
(`/products/[slug]`) is done as of Phase 6, cart + wishlist (`/cart`, `/wishlist`) is done as of
Phase 7, and checkout + order creation (`/checkout`, `/order-success/[orderNumber]`,
`/track-order`) is done as of Phase 8 (see `docs/DESIGN-SYSTEM.md` §§9–13 and
`docs/PRODUCT-ROADMAP.md`) — still deferred: customer authentication/accounts, the admin
dashboard, automated payment gateway integration (bKash/Nagad/Rocket APIs), courier API
integration, and marketing/tracking (Meta Pixel/CAPI, GA4). Phase 3 built the **UI foundation**
several later phases reuse (`ProductCard`, `ProductGrid`, `Price`, `SearchBar`, `Header`/`Footer`
chrome, the homepage's `home/` components, the listing pages' `shop/` components, the product
page's `product/` components, the `cart/`/`wishlist/` components, and now the `checkout/`
components) — the newsletter form still doesn't subscribe anyone, but every other "foundation
only" caveat from earlier phases (Add to Cart, wishlist, checkout) has since been made real. The
folder structure exists to receive what's left (auth, admin, payment/courier APIs, tracking)
without restructuring — it plugs into `src/services/`/`src/actions/` once there's something real
to call.
