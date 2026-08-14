# Architecture

Status: **Phase 10 — Admin dashboard + store management**. This document describes the architecture
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
| Data layer | MongoDB Atlas + Mongoose | `Order` connected Phase 8, `Address` Phase 9, `Product`/`Category`/`AdminAuditLog`/`StoreSettings` Phase 10 (`src/lib/db.ts`) — every domain model is now MongoDB-backed |
| Mutation layer | Next.js Server Actions | `src/actions/orders.ts` (`createOrder`, `trackOrder`), `src/actions/admin/*` (Phase 10) — chosen over Route Handlers since no API surface existed yet and Server Actions are the idiomatic Next 16 fit for form mutations from Client Components; Route Handlers remain an option for a future non-mutation/external-consumer API |
| Validation | Zod | `src/actions/order-schema.ts` — the first genuinely untrusted-network-input case in this codebase (see `src/lib/validate-product.ts`'s doc comment, which deliberately skipped Zod for trusted seed data) |
| Auth | Better Auth (`better-auth`) | `src/lib/auth.ts` — email + password (Phase 9), MongoDB adapter via a native `mongodb` driver client pointed at the same `renvura` database as Mongoose; see "Authentication & customer accounts" below |
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
│   │   ├── login/, signup/            Auth pages (Phase 9) — see docs/DESIGN-SYSTEM.md §14
│   │   ├── account/                   Protected customer account area (Phase 9, layout.tsx gates
│   │   │                                the whole subtree): page.tsx, orders/, orders/[orderNumber]/,
│   │   │                                addresses/, profile/ — see docs/DESIGN-SYSTEM.md §14
│   │   ├── api/auth/[...all]/         Better Auth's own route handler (Phase 9) — see below
│   │   ├── admin/                     Admin dashboard (Phase 10, layout.tsx gates the whole
│   │   │                                subtree): page.tsx (dashboard), orders/, orders/[orderNumber]/,
│   │   │                                payments/, products/, products/[slug]/edit/, products/new/,
│   │   │                                categories/, categories/[slug]/edit/, categories/new/,
│   │   │                                customers/, customers/[userId]/, inventory/, homepage/,
│   │   │                                analytics/, settings/delivery/ — see "Admin dashboard &
│   │   │                                authorization" below
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
│   │   ├── checkout/                 Checkout composition (Phase 8): CheckoutForm,
│   │   │                              CustomerInfoSection, DeliveryAddressSection,
│   │   │                              PaymentMethodSection, OrderSummary, TrackOrderForm,
│   │   │                              SavedAddressSelector (Phase 9) — see docs/DESIGN-SYSTEM.md §13
│   │   ├── auth/                     Auth forms (Phase 9): LoginForm, SignupForm
│   │   ├── account/                  Account-area composition (Phase 9): AccountLayout,
│   │   │                              AccountSidebar, AccountMobileNav, SignOutButton,
│   │   │                              HeaderAccountLink, ProfileForm, AddressList, AddressForm —
│   │   │                              see docs/DESIGN-SYSTEM.md §14
│   │   ├── admin/                    Admin-shell composition (Phase 10): AdminLayout, AdminSidebar,
│   │   │                              AdminTopBar, adminNav.ts, ConfirmActionButton, StatusBadge,
│   │   │                              StatCard, AdminPagination, BarChart, ProductForm,
│   │   │                              CategoryForm, StoreSettingsForm, OrderStatusForm,
│   │   │                              StockAdjustForm, FeaturedToggle, CategoryOrderForm
│   │   └── analytics/                 Tracking components (Phase 11): AnalyticsScripts (Meta
│   │                                   Pixel/GA4 script loading), RouteTracker (client-side
│   │                                   PageView/page_view on route change), PurchaseTracker
│   │                                   (browser Purchase/purchase on /order-success)
│   ├── actions/                    Server Actions ("use server"): orders.ts (createOrder,
│   │                                 trackOrder, Phase 8), order-schema.ts (Zod), order-logic.ts
│   │                                 (DB-free validate-and-recalculate), address-schema.ts (Zod),
│   │                                 addresses.ts (createAddress/updateAddress/deleteAddress/
│   │                                 setDefaultAddress, Phase 9)
│   ├── actions/admin/              Admin Server Actions (Phase 10): orders.ts
│   │                                 (adminUpdateOrderStatus), payments.ts (markPaymentPaid/
│   │                                 markPaymentFailed), products.ts (adminCreateProduct/
│   │                                 adminUpdateProduct/adminSetFeatured/adminAdjustStock),
│   │                                 categories.ts (adminCreateCategory/adminUpdateCategory/
│   │                                 adminSetCategoryActive), settings.ts (adminUpdateStoreSettings)
│   ├── config/                    brand.ts, navigation.ts, delivery.ts (Phase 10: fallback default
│   │                                only, see below), payment.ts (Phase 8), store.ts (Phase 10)
│   ├── contexts/                   CartContext.tsx, WishlistContext.tsx (Phase 7) — guest cart/
│   │                                 wishlist state; see the untrusted-client-state note below
│   ├── data/                       categories.ts, products.ts (Phase 2 — Phase 10: original
│   │                                 human-verified record only, no longer read at runtime),
│   │                                 bangladesh-locations.ts (Phase 8 — Division/District/Upazila
│   │                                 hierarchy; single source of truth for both checkout and saved
│   │                                 addresses)
│   ├── hooks/                      Client-side React hooks
│   ├── lib/                         Framework-agnostic utilities (validate-product.ts,
│   │                                  local-storage.ts, rate-limit.ts, bangladesh-address-validation.ts),
│   │                                  db.ts (MongoDB connection, Phase 8), auth.ts/auth-client.ts/
│   │                                  auth-session.ts (Better Auth server config incl. `role` field
│   │                                  and `authDb` native-driver export, client instance,
│   │                                  `getCurrentUser()`/`getCurrentAdmin()`/`requireAdmin()` —
│   │                                  Phase 9/10)
│   ├── lib/analytics/                Meta Pixel/CAPI + GA4 (Phase 11): config.ts, event-types.ts,
│   │                                   event-id.ts, normalization.ts (server-only hashing),
│   │                                   mapping.ts, meta-client.ts, ga4-client.ts, meta-server.ts —
│   │                                   see "Marketing / tracking (Phase 11)" below
│   ├── models/                       Mongoose schemas: Product.ts, Category.ts (connected, Phase
│   │                                   10), Order.ts (connected, Phase 8; statusHistory added
│   │                                   Phase 10), Address.ts (Phase 9), AdminAuditLog.ts,
│   │                                   StoreSettings.ts (Phase 10). User/Session/Account/
│   │                                   Verification are Better Auth-managed collections in the
│   │                                   same database, not Mongoose models.
│   ├── services/                      Data-access layer: products.ts (MongoDB-backed as of Phase
│   │                                    10, plus admin product/category writes), orders.ts
│   │                                    (MongoDB-backed, Phase 8; Phase 10 adds admin list/detail/
│   │                                    status/payment/dashboard/analytics reads+writes),
│   │                                    addresses.ts (MongoDB-backed, Phase 9), customers.ts
│   │                                    (Phase 10), settings.ts (Phase 10), audit-log.ts (Phase 10)
│   ├── types/                          product.ts, category.ts, cart.ts, order.ts (Phase 10:
│   │                                    OrderStatusHistoryEntry, AdminOrderDetail/ListItem,
│   │                                    ORDER_STATUS_TRANSITIONS), address.ts (Phase 9),
│   │                                    customer.ts (Phase 10) — shared TypeScript domain types
│   └── utils/                          currency.ts, slug.ts, pricing.ts, phone.ts, delivery.ts,
│                                        safe-redirect.ts (Phase 9) — small pure helpers
├── scripts/                   Standalone tsx scripts, never imported by the app: load-env.ts,
│                                 promote-admin.ts (Phase 10 admin bootstrap, see below),
│                                 seed-catalog.ts (Phase 10 one-time Mongo catalog migration)
├── proxy.ts                  Next 16 route protection (Phase 9/10) — optimistic redirect for
│                                /account/* and /admin/*
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

### Product & Category (Phase 2 — data model; Phase 10 — MongoDB-connected)

`src/types/product.ts` and `src/types/category.ts` define the domain model; `src/models/Product.ts`
and `src/models/Category.ts` define the matching Mongoose schemas, connected as of Phase 10 (see
"Data access" below). Key shape decisions:

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
  that will always be true), `category`/`subcategory`/`status`/`tags`, and (Phase 10) a compound
  `{status, featured}` index for the homepage's featured-products query.
- **Phase 10 additions**: `Product.featured` (boolean, admin-controlled homepage placement — never
  set by any storefront/customer code path) and `Category.isActive`/`displayOrder` (admin
  activate/deactivate and homepage highlight ordering). Admin-created products (via
  `/admin/products/new`) have no `source` provenance and `pricing.wholesalePrice: null` — that
  field stays reserved for the original supplier-screenshot-extracted catalog.

**Not yet implemented**: `Review`, `Coupon`. These will follow the same "only model what's needed,
don't invent fields ahead of need" approach in later phases. Customer identity itself is now
handled by Better Auth (Phase 9 — see "Authentication & customer accounts" below), not a custom
`Customer` model — "customer" rows in the Phase 10 admin dashboard are Better Auth `user` documents
read via `authDb`, not a separate model either (see "Admin dashboard & authorization" below).

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
As of Phase 9, `Order` also carries `customerUserId: string | null` (indexed) — see
"Authentication & customer accounts" below. As of Phase 10, `Order` also carries `statusHistory`
(an append-only array of `{status, changedAt, changedBy}`, `changedBy` being the admin's Better
Auth user id or `null` for the initial system-set `"pending"` entry) — see "Admin dashboard &
authorization" below. As of Phase 12, `statusHistory` entries also carry an optional `note`, and
`Order` gained four new subdocuments — `confirmation` (method/timestamp, customer-safe;
confirmedBy/note, admin-only), `cancellation`/`return` (reason codes + notes, entirely
admin-only), and `courier` (provider/trackingId/trackingUrl/consignmentId/shippedAt, fully
customer-safe) — see "Order operations & customer lifecycle (Phase 12)" below.

### InventoryMovement (Phase 12 — new, MongoDB-connected)

`src/models/InventoryMovement.ts` — an append-only ledger of every order-driven stock adjustment
(`{productId, quantityDelta, reason, orderNumber, actorUserId, createdAt}`), written by
`src/services/inventory.ts`. Distinct from `AdminAuditLog`: this captures the exact quantity delta
per product per movement for a future stock-reconciliation report, while `AdminAuditLog` separately
records the admin action that triggered it.

### AdminAuditLog & StoreSettings (Phase 10 — done, MongoDB-connected)

`src/models/AdminAuditLog.ts` is an append-only log of high-value admin mutations
(`{adminUserId, action, entityType, entityId, before, after, createdAt}`), written by
`src/services/audit-log.ts`'s `recordAuditLog()`. `before`/`after` are narrow, hand-picked field
snapshots, never a full document dump or a secret. `src/models/StoreSettings.ts` is a singleton
document (`singletonKey: "store"`, upserted into existence on first read) holding
`storeName`/`supportEmail`/`supportPhone`/`insideDhakaDeliveryFee`/`outsideDhakaDeliveryFee`/
`lowStockThreshold` — see "Admin dashboard & authorization" below for why this supersedes
`src/config/delivery.ts` as the runtime delivery-fee source.

### Address (Phase 9 — done, MongoDB-connected)

`src/types/address.ts` defines the domain model; `src/models/Address.ts` defines the matching
Mongoose schema. Same BD location shape as `Order.shippingAddress` (division/district/upazila/
addressLine/landmark/notes), plus `label`/`recipientName`/`phone`/`isDefault` — a saved address is
a delivery destination with its own recipient, which may differ from the account holder. Always
scoped to `userId`; see "Authentication & customer accounts" below for the ownership rules.

### Order notifications (Phase 10.5 addendum — done, MongoDB-connected)

`Order.notifications.orderConfirmationEmail` (`src/models/Order.ts`) records the outcome of the
one order-confirmation-email attempt for that order: `status` (`"not_applicable"` | `"pending"` |
`"sent"` | `"failed"`), `sentAt`, `providerMessageId` (Resend's own email id — admin-only, see
"Customer verification & account recovery" below), and a truncated `lastError`. No new collection —
this is an addition to the existing `Order` schema, written by `src/services/orders.ts`'s
`insertOrder`/`recordOrderConfirmationEmailResult`.

### Order analytics (Phase 11 addendum — done, MongoDB-connected)

`Order.analytics.metaPurchase` (`src/models/Order.ts`) mirrors the notifications field above:
`status` (`"not_applicable"` | `"pending"` | `"sent"` | `"failed"`), `eventId` (always the
deterministic `purchase:{orderNumber}` value, see CLAUDE.md's "Analytics & measurement (Phase 11)"
section), and `sentAt`. Admin-only, never part of `OrderSummary`. Written by
`insertOrder`/`recordMetaPurchaseResult`, following the exact same structural pattern.

### Data access — MongoDB for everything as of Phase 10

**Orders were the first real MongoDB-backed data** (Phase 8); addresses and auth followed in Phase
9; products, categories, the admin audit log, and store settings followed in Phase 10, migrated
one time from `src/data/products.ts`/`categories.ts` (the verified catalog extracted in Phase 2 —
see `docs/PRODUCT-DATA.md`) by `scripts/seed-catalog.ts`. `src/services/products.ts`/`orders.ts`/
`addresses.ts`/`customers.ts`/`settings.ts`/`audit-log.ts` are the only places that query their
respective Mongoose models (or, for `customers.ts`, the native `user` collection via `authDb`)
directly, all via the cached connection helper in `src/lib/db.ts` (`connectToDatabase()` — reuses
one connection across dev hot-reloads and serverless invocations, throws a clear error if
`MONGODB_URI` is unset, never logs the URI). Better Auth uses a separate native-driver connection
to the same database — see "Authentication & customer accounts" below. `src/data/products.ts`/
`categories.ts` remain in the repo as the original human-verified record (and `validate-product.ts`
still validates against them), but the running app no longer reads them at request time.

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

**Delivery fee — business-approved starting values, live-editable as of Phase 10.**
`src/config/delivery.ts`'s `deliveryFees` (৳80 inside Dhaka, ৳150 outside Dhaka) now only supplies
the fallback used the first time the `StoreSettings` singleton is created; the runtime source of
truth checkout actually reads is `getDeliveryFees()` (`src/services/settings.ts`), editable at
`/admin/settings/delivery` — see "Admin dashboard & authorization" below. Delivery fee is still
paid by the customer and added to the product subtotal to produce the order total — see CLAUDE.md.

## Authentication & customer accounts (Phase 9)

Better Auth (`src/lib/auth.ts`) handles sign-up/sign-in/sign-out and session management — email +
password only for now, kept extensible (adding a provider later is a `socialProviders` config
entry, not an architectural change). It has no official Mongoose adapter, so it uses its own native
`mongodb` driver `MongoClient` (cached on `globalThis`, same hot-reload-safety reasoning as
`connectToDatabase()`) pointed at the *same* `renvura` database Mongoose already uses — one
logical database, two driver instances, not data fragmentation. `user`/`session`/`account`/
`verification` are Better Auth-managed collections; a `phone` field is added to `user` via
`additionalFields` rather than a separate `CustomerProfile` collection, so it's available
automatically on `session.user.phone` with no extra query.

**Session access, layered like Better Auth's own recommended pattern:**
- `proxy.ts` (Next 16 route-protection file, was `middleware.ts`) does a fast, cookie-*presence*-only
  redirect for `/account/:path*` via `getSessionCookie()` — no database call, not authoritative
  (verified live: a forged/garbage cookie value still passes this check).
- `src/app/account/layout.tsx` does the real check — `getCurrentUser()` (see below) — before any
  nested page runs; a forged cookie is caught here and redirected (verified live).
- `src/lib/auth-session.ts`'s `getCurrentUser()` is the *one* place server code asks "who's signed
  in?" — wraps `auth.api.getSession({ headers: await headers() })` and returns only
  `{ id, name, email, phone } | null`, never the raw session object (which carries the session
  token). This is the same "never let more than needed cross a trust boundary" principle already
  applied to `wholesalePrice` — just applied to session data now.
- The header's account widget (`HeaderAccountLink.tsx`) deliberately does *not* receive a
  server-fetched session — it's a Client Component calling Better Auth's own `useSession()` hook
  directly. This keeps `Header.tsx` a plain Server Component with no `headers()`/`cookies()` call,
  so the public storefront pages that render it (`/`, `/shop`, category pages, `/products/[slug]`)
  keep their static-generation eligibility — confirmed in the Phase 9 build output (`/` stayed
  `○ Static`; only `/account/*`, `/checkout`, `/login`, `/signup` are `ƒ Dynamic`, and the latter
  two are static shells around a client form, dynamic only because Next marks `/api/auth/[...all]`
  itself as such). This accepts the same brief hydration flash already accepted for cart/wishlist
  counts — a display convenience only; every protected read is independently re-validated
  server-side regardless of what the header shows.

**Addresses** (`src/models/Address.ts`, `src/services/addresses.ts`, `src/actions/addresses.ts`)
are their own Mongoose collection, not embedded in `user` — individual add/edit/delete/set-default
is simpler against a top-level collection, matching the existing `Order`-is-its-own-collection
pattern. `userId` (Better Auth's string user id) is indexed; a **unique partial index** on
`{ userId: 1, isDefault: 1 }` (filtered to `isDefault: true`) enforces "at most one default per
customer" at the database level — the same defense-in-depth pattern already used for `Order`'s
`idempotencyKey`/`orderNumber`. Division/District/Upazila validation is shared with checkout via
`checkBangladeshLocationRelationship` (`src/lib/bangladesh-address-validation.ts`), extracted so
the same relationship check isn't implemented twice.

**Ownership is always server-derived, mirroring the existing price-recalculation rule exactly**:
- `createOrder` calls `getCurrentUser()` itself and sets `Order.customerUserId` — the client-
  submitted payload has no such field to even strip. A session-lookup failure degrades to "treat
  as guest" rather than blocking checkout, so guest checkout can never depend on auth working.
- Every address Server Action derives `userId` from the session, never a parameter. Update/delete/
  set-default first re-fetch the target scoped to `{ id, userId }`; a mismatch (wrong owner, or a
  made-up id) returns the identical "not found" response a genuinely-missing address would — never
  "forbidden," which would itself confirm the resource exists. Verified live with two real test
  accounts: cross-user address edit/delete/set-default and cross-user order list/detail access were
  all rejected this way, with the target resource unmodified in every case.
- `/account/orders/[orderNumber]` fetches scoped to `{ orderNumber, customerUserId: user.id }` —
  same posture as `/track-order`: a mismatch 404s exactly like a nonexistent order.

**Historical guest-order linking is explicitly deferred** (the brief's own preferred option) —
existing guest orders (`customerUserId: null`, including every order from before Phase 9) stay
guest orders; only new orders placed while signed in get linked. Confirmed live: a pre-Phase-9
guest order remains fully trackable via `/track-order` and unaffected by the schema change, and
does not appear in any customer's `/account/orders`.

## Admin dashboard & authorization (Phase 10)

**Role model.** A `role` field (`"customer" | "admin"`, default `"customer"`) was added to Better
Auth's `user` document via `additionalFields` in `src/lib/auth.ts`, declared `input: false` so
Better Auth's own generated request validators reject `role` on sign-up and
`authClient.updateUser()` — a forged `{role:"admin"}` payload never reaches a handler. No
Server Action or route can set this field.

**Bootstrap.** The only sanctioned way to grant/revoke admin is `scripts/promote-admin.ts` — a
standalone `tsx` script (`npm run admin:promote -- <email>` / `npm run admin:demote -- <email>`)
that writes directly to the native `user` collection with the MongoDB driver, deliberately
bypassing Better Auth's HTTP API (the only path allowed to, since `role` is `input: false`
everywhere else). Requires the target user to already have signed up as a normal customer. No
email is ever auto-promoted from a hardcoded list — this is always a deliberate, manual, one-user-
at-a-time operator action.

**Authorization is layered**, extending the exact pattern already established for `/account/*`:
- `proxy.ts` extends its existing cookie-presence-only matcher to `/admin/:path*` — fast, not
  role-aware, not authoritative.
- `src/app/admin/layout.tsx` does the real check: `getCurrentUser()`, then `role === "admin"`.
  A signed-in non-admin gets `notFound()` — not a 403 — identical to what a genuinely nonexistent
  route or another user's order would return, so a customer account can't even confirm `/admin`
  exists.
- `src/lib/auth-session.ts` adds `getCurrentAdmin()` (returns the profile or `null`) and
  `requireAdmin()` (returns the profile or throws `AdminAuthorizationError`) alongside the existing
  `getCurrentUser()`. **Every admin Server Action calls `requireAdmin()` again, independently, at
  the top of its own body** — a Server Action is a real HTTP endpoint, reachable directly
  regardless of whether the page that normally renders a button for it ran its own layout check
  first. This is the same "never trust that an earlier layer already checked" posture `createOrder`
  already applies to price recalculation.

**Product/category catalog architecture decision.** The Phase 10 brief's central risk was building
an admin CRUD UI on top of a catalog the storefront doesn't actually read from — this was resolved
by migrating the catalog itself: `src/services/products.ts` now queries `ProductModel`/
`CategoryModel` for every read (storefront *and* admin), and admin writes
(`src/actions/admin/products.ts`/`categories.ts`) go through those same models. There is exactly
one source of truth. `src/data/products.ts`/`categories.ts` stay as the original human-verified
record (migrated once by `scripts/seed-catalog.ts`, safe to re-run — it never overwrites an
existing document unless passed `--force`), not a second, drifting copy the app reads from.

**Order status is a state machine.** `ORDER_STATUS_TRANSITIONS`/`canTransitionOrderStatus()`
(`src/types/order.ts`) enumerate the only legal transitions (`cancelled` reachable from any
non-terminal status, `returned` only from `delivered`, both terminal); `adminUpdateOrderStatus`
checks a raw client string against the full enum and then this table before writing, and appends
to `statusHistory` rather than replacing it.

**Payment verification** (`src/actions/admin/payments.ts`) only ever moves
`payment.status: "pending_verification"` → `"paid"`/`"failed"`. Cash on Delivery orders
(`cod_pending`) structurally can't appear in this queue — `getPendingVerificationOrders` filters on
a status COD orders never have.

**Analytics/revenue definitions** are conservative by design — see the doc comments on
`getOrderDashboardStats`/`getAverageOrderValue`/`getSalesByDay`/`getTopSellingProducts` in
`src/services/orders.ts`, and `getOrderStatsForUserIds` in `src/services/customers.ts` for why a
customer's "Total Delivered Order Value" uses a narrower definition (`orderStatus === "delivered"`
only) than the dashboard's "Revenue" (`payment.status === "paid"` OR `orderStatus === "delivered"`)
— the two are intentionally not meant to reconcile 1:1.

**`StoreSettings`** (see "AdminAuditLog & StoreSettings" above) supersedes `src/config/delivery.ts`
as the runtime delivery-fee source; `/admin/settings/delivery` is the only write path. Manual
payment numbers and real secrets stay env-only, never migrated into this collection.

**Customers are Better Auth `user` documents**, not a separate model — `src/services/customers.ts`
queries the native `user` collection via `authDb` (`src/lib/auth.ts`'s exported native-driver `db`
handle) with an explicit `{_id, name, email, phone, createdAt}` projection, never the full
document. There is no "log in as customer" feature.

**Audit trail** (`src/models/AdminAuditLog.ts`, `src/services/audit-log.ts`) — every order-status
change, payment verification, and product/category/inventory/homepage/settings write calls
`recordAuditLog()` right after the write succeeds, with narrow hand-picked `before`/`after`
snapshots.

**Known limitations**: no automated test suite exists in this repo (verification was `tsc`/
`eslint`/`next build` plus manual/browser checks, not committed test files); no product image
upload UI (thumbnail/image fields are plain text paths under `/products/`); no bulk-edit/bulk-
import tooling; categories can be deactivated but not deleted (existing products may still
reference a category's slug).

## Customer verification & account recovery (Phase 10.5)

**Checkout phone OTP was built, then deferred before shipping.** A full session-independent
system (a `CheckoutPhoneVerification` collection, `phone-verification` Server Actions, a
`PhoneVerificationSection` UI, an `sms-provider.ts` abstraction) was implemented and tested against
the real database, but the business decision changed: no Bangladesh SMS gateway was selected, and
Renvura launches instead with **manual phone/WhatsApp order confirmation** — staff call/message the
customer using the phone number already on the order and move it from `pending` to `confirmed` (or
`cancelled`) via the existing Phase 10 admin order-status workflow, no new code required for that
part. All the phone-OTP code was removed; checkout only normalizes and validates the phone number
(`normalizeBdPhone`, unchanged since Phase 8) with no proof-of-control step. If phone OTP is
revisited later, the right reference point is a real SMS provider's actual API, not the removed
code — Better Auth's `phone-number` plugin still wouldn't be the right tool for guest checkout for
the same reason originally documented (its `/phone-number/verify` endpoint requires or fabricates
a `user` document).

**Email verification + password reset** reuse Better Auth's `email-otp` plugin end to end — no
custom verification-token storage — and this half is unchanged from the earlier pass. `src/lib/auth.ts`
sets `emailAndPassword.requireEmailVerification: true` (blocks sign-in for unverified accounts,
confirmed via `sign-in.mjs`'s `EMAIL_NOT_VERIFIED` throw, and skips `autoSignIn` at signup per
`sign-up.mjs`), `revokeSessionsOnPasswordReset: true`, and
`emailVerification.autoSignInAfterVerification: true`. `emailOTP({overrideDefaultEmailVerification:
true, ...})` swaps Better Auth's default link-based verification for the same 6-digit-code UX
throughout — signup, resend-on-blocked-login, and password reset. `src/lib/auth-client.ts`'s
`emailOTPClient()` exposes `authClient.emailOtp.{sendVerificationOtp, verifyEmail,
requestPasswordReset, resetPassword}`, consumed by the `/verify-email`, `/forgot-password`, and
`/reset-password` routes (`src/components/auth/{VerifyEmailForm,ForgotPasswordForm,ResetPasswordForm}.tsx`).
`/email-otp/request-password-reset` always returns the same generic response whether or not the
email has an account (confirmed in `email-otp/routes.mjs`) — `ForgotPasswordForm.tsx` relies on
this directly rather than adding its own branching.

**No existing account is retroactively marked verified.** `emailVerified` already existed on every
Better Auth user (core field, unused/`false` until now); turning on `requireEmailVerification`
changes what's enforced going forward, not any stored data — pre-Phase-10.5 accounts see the same
"verify to continue" + Resend flow as anyone else on their next sign-in, matching this codebase's
existing never-fabricate-data principle.

**Password reset rejects current-password reuse**, via `rejectSamePasswordOnReset` — a top-level
Better Auth `hooks.before` middleware (`src/lib/auth.ts`), not a fork or a `databaseHooks` entry
(database hooks only ever see the already-hashed value; a request-level "before" hook is the only
extension point that still has the raw candidate password to compare). Matches
`/email-otp/reset-password`, reuses `ctx.context.password.verify()` (the same primitive Better
Auth's own `changePassword` uses) against the account's current credential hash, and throws
`SAME_AS_CURRENT_PASSWORD` before Better Auth's handler — and therefore before `atomicVerifyOTP`
— ever runs, so a rejected attempt never burns the OTP.

**Resend is the production transactional email provider — one central module, one call site.**
`src/lib/email-provider.ts` is the only file that imports `resend`; every email (verification OTP,
password-reset OTP, order confirmation) is built as an `EmailContent` (`src/lib/email-templates.ts`)
and passed to that file's private `sendEmail()`, the single place `resend.emails.send()` is ever
called. Configuration: `RESEND_API_KEY` (secret, required for any real send), `EMAIL_FROM_ADDRESS`
(defaults to `"Renvura <no-reply@renvura.com>"`), `EMAIL_REPLY_TO` (defaults to `hello@renvura.com`).
**Unconfigured as of this phase** — no Resend account/API key exists yet and the `renvura.com`
sending domain is not yet verified with Resend, both required before any real email can send (see
"Environment variables" below). In production with no key set, sending fails closed (logged
server-side, response to the caller unaffected — see the anti-enumeration note above); in
development, the full email is logged to the server console instead of sending, strictly gated
behind `NODE_ENV !== "production"`.

**Order confirmation email** (`sendOrderConfirmationEmail`) is new this phase. `createOrder`
(`src/actions/orders.ts`) schedules it via Next's `after()` (`next/server`, stable since 15.1) only
when `input.customer.email` is present — checkout email stays fully optional for both guest and
logged-in checkout, and its absence is never an error. `after()` runs the send *after* the
order-creation response has already reached the browser, so Resend being slow or failing can never
delay or affect the customer-visible result of placing the order — `insertOrder`'s persistence is
authoritative and is never rolled back for an email outcome. The email is built entirely from the
sanitized `OrderSummary` projection, so `wholesalePrice`, the Mongo `_id`, `idempotencyKey`,
`customerUserId`, and `statusHistory` are structurally excluded, not just manually avoided. Since
every new order starts and stays `pending` until a human confirms it by phone/WhatsApp, the subject
is always `"Renvura Order Received — {orderNumber}"` — never "confirmed."

**Order-confirmation-email idempotency is structural.** `scheduleOrderConfirmationEmail` is called
from exactly one branch of `createOrder`: immediately after a genuinely new `insertOrder()`
succeeds. Both of `createOrder`'s existing early-return paths — the idempotency-key replay and the
insert-race loser — return before that call site, so a double-submit or client retry can never
schedule a second email for the same order; no additional "already sent" check was needed for
correctness. `Order.notifications.orderConfirmationEmail` (see the "Data model" section above)
still records the one attempt's outcome for admin visibility, not as the dedupe mechanism itself.

**Account phone-update verification** (`/account/profile`) remains explicitly out of scope, as it
was in the earlier pass — see CLAUDE.md.

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

## Marketing / tracking (Phase 11)

Meta Pixel (browser) + Meta Conversions API (server) + GA4 are implemented — see CLAUDE.md's
"Analytics & measurement (Phase 11)" section for the full architecture. In brief: `src/lib/
analytics/` is the one place any `fbq()`/`gtag()`/Meta Graph API call happens; `event_id`
deduplication is Purchase-only (`purchaseEventId(orderNumber)`, shared between the browser Pixel
fire on `/order-success` and the server CAPI send scheduled from `createOrder`'s `after()` hook,
mirroring `scheduleOrderConfirmationEmail`'s exact idempotency pattern); PageView/page_view URLs
are pathname-only (`RouteTracker.tsx` never reads `useSearchParams()`) to keep PII-bearing query
strings (`/verify-email?email=...`) out of both providers entirely. Not implemented: GTM (direct
gtag/fbq instead), Google Ads conversion tracking, TikTok Pixel, Microsoft Ads, an internal
order-lifecycle event bus, email marketing automation, CRM integrations, or Meta refund/
cancellation attribution.

## Order operations & customer lifecycle (Phase 12)

Full production order-management workflow — see CLAUDE.md's "Order operations & customer
lifecycle (Phase 12)" section for the complete architecture (canonical status flow, transition
compare-and-swap, confirmation/cancellation/return/courier data model, inventory reservation
strategy and its exactly-once guarantee, payment/status coordination, customer emails, the shared
customer-safe tracking timeline, COD quality metrics, and the Meta/GA4 retargeting audience
documentation). In brief:

- `ORDER_STATUS_TRANSITIONS` (`src/types/order.ts`) is a strict DAG — no status is ever revisited.
  `updateOrderStatusForAdmin` (`src/services/orders.ts`) now performs a real compare-and-swap
  (matches on `orderNumber` *and* the caller's expected current status), which is what makes every
  downstream side effect (inventory, payment coordination, email) safely exactly-once without its
  own separate idempotency bookkeeping.
- `src/services/inventory.ts` + `src/models/InventoryMovement.ts` (new) — decrements stock on
  `pending → confirmed`, restores it on a cancellation from any already-decremented status or on a
  `resellable: true` return. Atomic `$inc`, never touches `inventory.status` (mirrors the existing
  `adminAdjustStock` precedent).
- `Order.confirmation`/`cancellation`/`return`/`courier` are new subdocuments
  (`src/models/Order.ts`) — confirmation method/timestamp and courier info are customer-safe;
  cancellation/return reason codes and all internal notes are admin-only (`OrderSummary` omits
  them structurally, not just by convention).
- `src/components/checkout/OrderStatusTimeline.tsx` is a shared customer-safe progress timeline
  used by both `/track-order` and `/account/orders/[orderNumber]`.
- `src/components/admin/OrderStatusActions.tsx` replaces the old dropdown-based
  `OrderStatusForm.tsx` — one button per valid transition, each expanding into exactly the fields
  that transition needs.
- No courier API integration — schema/UI readiness only, `provider` is free text so no single
  Bangladesh courier is hardcoded as mandatory.
- The Meta/GA4 retargeting audience recommendations (recommended windows, purchase-exclusion
  logic, product-specific/catalog-ad readiness) are pure documentation — no application code
  implements or applies any of it; see CLAUDE.md.

## SEO readiness

Next.js Metadata API is already in use for base metadata (`src/app/layout.tsx`), per-route
metadata on the homepage and the three Phase 5 listing routes, and now dynamic per-product
metadata (`generateMetadata()` in `src/app/products/[slug]/page.tsx`) plus Product JSON-LD as of
Phase 6 — truthful titles/descriptions throughout, `alternates.canonical` pointing at the clean
query-free path. Canonical URLs, OG image resolution, and the root layout's `metadataBase` are all
gated behind `isConfigured(brand.urls.site)` — wired, but inactive until a real production domain
replaces that `TODO`. `sitemap.ts`, `robots.ts`, and any SEO work beyond individual-route metadata
remain unbuilt (not part of Phase 12's scope either — see "Order operations & customer lifecycle
(Phase 12)" above), but nothing in the current structure blocks adding them later.

## Environment variables (Phase 8–11)

Never committed — `.gitignore` blocks all `.env*`, so these are documented here and in CLAUDE.md
instead of a checked-in `.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | Yes, for any order/address/auth-touching code path | Server-only, never sent to the client, never logged. `connectToDatabase()` throws a clear error if unset; Better Auth's own `MongoClient` (`src/lib/auth.ts`) needs it too. |
| `MONGODB_DB_NAME` | No | Passed to both `mongoose.connect()`'s `dbName` option and Better Auth's `client.db(...)` call if set. |
| `BETTER_AUTH_SECRET` | Yes, for any auth code path | Server-only, never sent to the client, never logged — signs/encrypts sessions. Generate a strong random value (e.g. `openssl rand -base64 32`); never reuse a value across environments. |
| `BETTER_AUTH_URL` | Yes | The app's own base URL (e.g. `http://localhost:3000` in dev) — Better Auth uses it to construct callback/redirect URLs. Production must be `https://renvura.com` (no trailing slash). |
| `NEXT_PUBLIC_BKASH_NUMBER` | No, but bKash is disabled in checkout until set | Public by design — the customer must see it to send a manual payment. |
| `NEXT_PUBLIC_NAGAD_NUMBER` | No, same as above | |
| `NEXT_PUBLIC_ROCKET_NUMBER` | No, same as above | |
| `RESEND_API_KEY` | No — but all real email delivery (verification, password reset, order confirmation) fails closed in production until set | Server-only, never logged, never `NEXT_PUBLIC_*`. Currently unset — no Resend account exists yet. See `src/lib/email-provider.ts`. |
| `EMAIL_FROM_ADDRESS` | No | Server-only. Defaults to `"Renvura <no-reply@renvura.com>"` if unset — set explicitly once the `renvura.com` domain is verified in Resend. |
| `EMAIL_REPLY_TO` | No | Server-only. Defaults to `hello@renvura.com` if unset. |
| `NEXT_PUBLIC_META_PIXEL_ID` | No — browser Pixel simply doesn't load until set | Public by design (the Pixel base snippet needs it client-side). Currently unset — no Meta Pixel/Business account configured yet. |
| `META_CAPI_ACCESS_TOKEN` | No — server CAPI simply doesn't send until set | Server-only, never logged, never `NEXT_PUBLIC_*`. A Meta CAPI access token from Events Manager → Conversions API settings. |
| `META_CAPI_DATASET_ID` | No | Server-only. Defaults to `NEXT_PUBLIC_META_PIXEL_ID` if unset (Meta's standard single-dataset setup) — only set this separately if using a dedicated CAPI dataset/Conversions API Gateway. |
| `META_TEST_EVENT_CODE` | No, dev/testing only | Server-only. From Meta Events Manager → Test Events — when set, every CAPI request includes `test_event_code` so sends show up in the Test Events tab instead of (or alongside) live event data. |
| `META_GRAPH_API_VERSION` | No | Server-only. Defaults to the snapshot documented in `src/lib/analytics/meta-server.ts` — verify against Meta's current Graph API changelog before relying on the default in production. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No — GA4 simply doesn't load until set | Public by design. Currently unset — no GA4 property configured yet. |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | No | Public. Set to `"true"` to opt into loading Meta Pixel/GA4 locally during `npm run dev` for testing — otherwise analytics only loads automatically when `NODE_ENV=production` (Vercel Production/Preview), so local development never pollutes real Meta/GA4 data. |

Phone OTP verification is deferred (see "Customer verification & account recovery" above) — no
`SMS_PROVIDER*` variables exist in this codebase.

## Explicitly deferred (not built yet)

The homepage was built ahead of schedule in the Phase 3 redesign, catalog/category listing
(`/shop`, `/electronics-gadgets`, `/health-beauty`) is done as of Phase 5, the product detail page
(`/products/[slug]`) is done as of Phase 6, cart + wishlist (`/cart`, `/wishlist`) is done as of
Phase 7, checkout + order creation (`/checkout`, `/order-success/[orderNumber]`, `/track-order`) is
done as of Phase 8, customer authentication + accounts (`/login`, `/signup`, `/account/*`) is done
as of Phase 9, and the admin dashboard (`/admin/*` — see "Admin dashboard & authorization" above)
is done as of Phase 10, and email verification + forgot/reset password + a Resend-backed order-
confirmation email (`/verify-email`, `/forgot-password`, `/reset-password` — see "Customer
verification & account recovery" above) is done as of Phase 10.5, Meta Pixel/Conversions API +
GA4 measurement (see "Marketing / tracking (Phase 11)" above) is done as of Phase 11, and the
production order-operations workflow — status transitions, inventory reservation, confirmation/
cancellation/return handling, courier readiness fields, status-change customer emails, the
customer-safe tracking timeline, COD quality metrics, and Meta/GA4 retargeting audience
documentation (see "Order operations & customer lifecycle (Phase 12)" above) — is done as of Phase
12 (see `docs/DESIGN-SYSTEM.md`
§§9–14 and `docs/PRODUCT-ROADMAP.md`) — still deferred: checkout phone OTP verification (built,
then explicitly deferred in favor of manual phone/WhatsApp order confirmation — see above),
automated payment gateway integration (bKash/Nagad/Rocket APIs), courier API integration (schema/
UI *readiness* exists as of Phase 12 — `Order.courier` — but no courier is actually called),
Google Ads conversion tracking, TikTok Pixel, Microsoft Ads, email marketing automation, CRM
integrations, server-side GTM, Meta refund/cancellation attribution, bulk admin order actions
(deliberately deferred — see CLAUDE.md's Phase 12 section), historical guest-order linking, in-app email *change*
(email *verification* itself is done), account phone-update verification, social/OTP login (Better
Auth's `socialProviders` config keeps this addable without restructuring, but nothing is wired up),
"log in as customer" admin impersonation, product image upload UI, bulk product import/export, an
automated email-retry/queue system for a failed order-confirmation send, and an automated test
suite. A Resend account/API key is also not yet configured and the `renvura.com` domain is not yet
verified with Resend — see "Environment variables" above. Phase 3 built the **UI
foundation** several later phases reuse (`ProductCard`, `ProductGrid`, `Price`, `SearchBar`,
`Header`/`Footer` chrome, the homepage's `home/` components, the listing pages' `shop/` components,
the product page's `product/` components, the `cart/`/`wishlist/` components, the `checkout/`
components, the `account/`/`auth/` components, and now the `admin/` components) — the newsletter
form still doesn't subscribe anyone, but every other "foundation only" caveat from earlier phases
(Add to Cart, wishlist, checkout, accounts, and now admin management) has since been made real.
