# CLAUDE.md

Guidance for Claude Code (and any future session/agent) working in this repository.

## What Renvura is

Renvura is a production-quality, Bangladesh-focused dropshipping e-commerce store. Phases 1–10 are
complete (foundation, product data model, storefront design system + homepage, listing, product
detail, cart/wishlist, checkout/order creation, customer authentication/accounts, and the admin
dashboard — see `docs/PRODUCT-ROADMAP.md`). The reusable UI, homepage, listing pages, product
detail page, cart/wishlist, checkout/order creation/tracking, customer accounts (sign-up/in/out,
saved addresses, order history), and the admin dashboard (`/admin/*` — orders, payments, products,
categories, customers, inventory, homepage curation, analytics, store settings) all exist and work
end-to-end.

**Business model:**
- A supplier provides products and wholesale pricing (source data currently captured as
  screenshots from a B2B wholesale/dropshipping marketplace — see `resources/products/`).
- Renvura displays and sells these products under its own brand.
- Customers order from Renvura; the supplier fulfills and ships using Renvura branding.
- Later, winning/proven products may be sourced directly (e.g. from China) and held as
  owned/private-label inventory instead of dropshipped.

**Initial categories:** Electronics/Gadgets, Health & Beauty.

## Tech stack

- Next.js 16 (App Router, Turbopack by default), React 19, TypeScript
- Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)
- HeroUI v3 (`@heroui/react` + `@heroui/styles`) — React Aria based, no `HeroUIProvider` needed
- `next-themes` for light/dark mode (class-based, see `src/components/layout/providers.tsx`)
- MongoDB / MongoDB Atlas + Mongoose — `Order` connected as of Phase 8, `Address` as of Phase 9
  (`src/lib/db.ts`, `src/models/`). As of Phase 10, `Product`/`Category` are connected too: the
  storefront's catalog read path (`src/services/products.ts`) now queries `ProductModel`/
  `CategoryModel` directly, migrated one time from the Phase 2 seed data by
  `scripts/seed-catalog.ts`. `src/data/products.ts`/`categories.ts` remain in the repo as the
  original human-verified record (and `src/lib/validate-product.ts`'s seed-data checks still read
  them), but are no longer what the running app serves — see "Admin dashboard & authorization
  (Phase 10)" below for the full architecture.
- Next.js Server Actions for mutations (`src/actions/`, Phase 8: `createOrder`, `trackOrder`;
  Phase 10: `src/actions/admin/*`) — Route Handlers remain unused/not yet built, since Server
  Actions fit the current all-forms mutation surface; revisit if a non-mutation or
  external-consumer API is ever needed
- Zod for untrusted-input validation (`src/actions/order-schema.ts`) — the first place this
  codebase validates real network input rather than its own trusted seed data
- Better Auth (`better-auth`, `src/lib/auth.ts`) for customer authentication (Phase 9) — email +
  password only for now, kept extensible via `socialProviders`. No official Mongoose adapter, so
  it uses its own native `mongodb` driver client pointed at the same `renvura` database as
  Mongoose, not a second database
- Vercel for deployment
- ESLint (flat config; `next lint` is removed in Next 16 — use `npm run lint`, which runs
  `eslint` directly)

### Next.js 16 — read the bundled docs before writing App Router code

This project was scaffolded on Next.js 16.3.0, which is newer than most models' training data and
has real breaking changes from Next 14/15 (removed `next lint`, async `params`/`searchParams` are
mandatory, `middleware` renamed to `proxy`, Turbopack is default, PPR replaced by
`cacheComponents`, `next/image` defaults changed, etc.). **Before implementing App Router
features you haven't verified against this exact version, read the relevant guide in
`node_modules/next/dist/docs/`** rather than relying on prior knowledge. `AGENTS.md` at the repo
root is auto-managed by `next dev` and repeats this reminder — don't hand-edit it.

## Architecture rules

- Server Components by default. Only add `"use client"` where interactivity/state/browser APIs
  are actually required.
- Use `next/image` for all images and `next/font` for fonts (already wired: Geist via
  `next/font/google` in `src/app/layout.tsx`).
- Import alias `@/*` maps to `src/*`.
- Folder layout (see `docs/ARCHITECTURE.md` for the full rationale):
  ```
  src/app/                 routes (App Router); page.tsx is the real homepage; shop/,
                             electronics-gadgets/, health-beauty/ are the Phase 5 listing routes;
                             products/[slug]/ is the Phase 6 product detail route; cart/,
                             wishlist/ are the Phase 7 routes; checkout/, order-success/[orderNumber]/,
                             track-order/ are the Phase 8 routes; login/, signup/, account/
                             (layout.tsx gates the whole subtree), api/auth/[...all]/ are the Phase
                             9 routes; admin/ (layout.tsx gates the whole subtree — orders,
                             orders/[orderNumber], payments, products, products/[slug]/edit,
                             products/new, categories, categories/[slug]/edit, categories/new,
                             customers, customers/[userId], inventory, homepage, analytics,
                             settings/delivery) is the Phase 10 admin dashboard; verify-email/,
                             forgot-password/, reset-password/ are the Phase 10.5 routes;
                             ui-preview/ is TEMPORARY — see below
  src/components/ui/       icons.tsx, IconLinkButton.tsx, Breadcrumbs.tsx, BangladeshAddressFields.tsx
                             (Phase 9 — shared by checkout and saved addresses) — small generic primitives
  src/components/layout/   Container, Section, AnnouncementBar, Header, SecondaryNav, Footer,
                             NewsletterSignup, StoreShell, NavLinks, MobileNav, providers
  src/components/ecommerce/ ProductCard, ProductGrid, Price, Badges, SearchBar — generic reusable
                             primitives (SearchBar now navigates to /shop?q=..., real search)
  src/components/home/      Homepage-only composition: HeroBanner, CategoryTabs,
                             FeaturedProductsRow, CategoryHighlights, WhyShopWithRenvura,
                             BrandStory — not meant for reuse elsewhere
  src/components/shop/      Listing-page-only composition: ProductListingPage, SortSelect,
                             MobileFilterDrawer — shared by all three Phase 5 routes
  src/components/product/   Product-detail-page-only composition: ProductGallery, BuyBox,
                             QuantitySelector, DeliveryPaymentInfo, ProductDetails (Phase 6)
  src/components/cart/      Cart composition (Phase 7): AddToCartButton, CartIcon,
                             CartCountBadge, CartDrawer
  src/components/wishlist/  Wishlist composition (Phase 7): WishlistToggleButton, WishlistCountBadge,
                             WishlistGrid
  src/components/checkout/  Checkout composition (Phase 8): CheckoutForm, CustomerInfoSection,
                             DeliveryAddressSection, PaymentMethodSection, OrderSummary,
                             TrackOrderForm, SavedAddressSelector (Phase 9) — no phone-verification
                             component (deferred, see "Customer verification & account recovery")
  src/components/auth/      Auth forms (Phase 9): LoginForm, SignupForm; Phase 10.5:
                             VerifyEmailForm, ForgotPasswordForm, ResetPasswordForm
  src/components/account/   Account-area composition (Phase 9): AccountLayout, AccountSidebar,
                             AccountMobileNav, SignOutButton, HeaderAccountLink, ProfileForm,
                             AddressList, AddressForm
  src/components/admin/     Admin-shell composition (Phase 10): AdminLayout, AdminSidebar,
                             AdminTopBar, adminNav.ts, ConfirmActionButton, StatusBadge, StatCard,
                             AdminPagination, BarChart, ProductForm, CategoryForm,
                             StoreSettingsForm, OrderStatusForm, StockAdjustForm, FeaturedToggle,
                             CategoryOrderForm — not meant for reuse outside /admin/*
  src/actions/               Server Actions ("use server"): orders.ts (createOrder, trackOrder,
                              Phase 8; Phase 10.5 adds the order-confirmation-email `after()` call),
                              order-schema.ts (Zod), order-logic.ts (DB-free
                              validate-and-recalculate), address-schema.ts (Zod), addresses.ts
                              (createAddress/updateAddress/deleteAddress/setDefaultAddress, Phase 9)
  src/actions/admin/         Admin Server Actions (Phase 10): orders.ts (adminUpdateOrderStatus),
                              payments.ts (markPaymentPaid/markPaymentFailed), products.ts
                              (adminCreateProduct/adminUpdateProduct/adminSetFeatured/
                              adminAdjustStock), categories.ts (adminCreateCategory/
                              adminUpdateCategory/adminSetCategoryActive), settings.ts
                              (adminUpdateStoreSettings) — every export independently calls
                              requireAdmin() first, see "Admin dashboard & authorization" below
  src/contexts/              CartContext.tsx, WishlistContext.tsx (Phase 7) — see the untrusted-
                              client-state rule below
  src/config/               brand.ts, navigation.ts, delivery.ts (Phase 10: fallback defaults only,
                              see below), payment.ts (Phase 8), store.ts (Phase 10:
                              DEFAULT_LOW_STOCK_THRESHOLD fallback)
  src/data/                 categories.ts, products.ts (Phase 2 — Phase 10: the original
                              human-verified record only, no longer read by the running app, see
                              "Admin dashboard & authorization" below), bangladesh-locations.ts
                              (Phase 8 — single source of truth for both checkout and saved addresses)
  src/hooks/                 client-side hooks
  src/lib/                   framework-agnostic utilities (validate-product.ts, local-storage.ts,
                              rate-limit.ts, bangladesh-address-validation.ts), db.ts (MongoDB
                              connection helper, Phase 8), auth.ts/auth-client.ts/auth-session.ts
                              (Better Auth server config incl. `role` field and `authDb` native-driver
                              export, client instance, getCurrentUser()/requireAdmin() — Phase 9/10;
                              Phase 10.5 adds the `email-otp` plugin), email-provider.ts/
                              email-templates.ts (Phase 10.5 — central Resend module + templates,
                              see "Customer verification & account recovery" below)
  src/models/                 Mongoose schemas: Product.ts, Category.ts (connected, Phase 10),
                              Order.ts (connected, Phase 8; statusHistory added Phase 10;
                              notifications.orderConfirmationEmail added Phase 10.5),
                              Address.ts (Phase 9), AdminAuditLog.ts, StoreSettings.ts (Phase 10).
                              User/Session/Account/Verification are Better Auth-managed, not
                              Mongoose models — `role` and `emailVerified` live on Better Auth's
                              `user` document.
  src/services/               data-access layer: products.ts (MongoDB-backed as of Phase 10, plus
                              admin list/create/update functions and category admin functions),
                              orders.ts (MongoDB-backed, Phase 8; Phase 10 adds admin list/detail/
                              status/payment/dashboard/analytics functions; Phase 10.5 adds
                              recordOrderConfirmationEmailResult), addresses.ts (MongoDB-backed,
                              Phase 9), customers.ts (Phase 10 — reads Better Auth's native `user`
                              collection via `authDb`, joined with Order aggregates), settings.ts
                              (Phase 10 — StoreSettings singleton), audit-log.ts (Phase 10 —
                              recordAuditLog, append-only)
  src/types/                  shared TypeScript types: product.ts, category.ts, cart.ts, order.ts
                              (Phase 10: OrderStatusHistoryEntry, AdminOrderDetail/ListItem,
                              ORDER_STATUS_TRANSITIONS), address.ts (Phase 9), customer.ts (Phase 10)
  src/utils/                  small pure helpers: currency.ts, slug.ts, pricing.ts, phone.ts,
                              delivery.ts, safe-redirect.ts (Phase 9)
  scripts/                   standalone tsx scripts (never imported by the app): load-env.ts,
                              promote-admin.ts (Phase 10 admin bootstrap, see below),
                              seed-catalog.ts (Phase 10 one-time Mongo catalog migration)
  proxy.ts                  repo root — Next 16 route protection (Phase 9), optimistic redirect
                              for /account/* and /admin/* (Phase 10), was middleware.ts pre-Next-16
  ```
- Keep UI, business logic, and data-access layers separate — don't put Mongoose queries or
  business rules directly in components or route handlers.
- No giant components, no duplicated logic, no premature abstraction. A bug fix doesn't need
  surrounding cleanup; a one-shot operation doesn't need a helper.
- Accessibility-conscious markup (HeroUI/React Aria helps here, but don't rely on it blindly).
- No fake business logic: no invented prices, stock counts, reviews, or policies anywhere in code,
  copy, or seed data.

## Resource and product data rules

- `resources/` and `assets/` are **source material, read-only**. Never modify, rename, delete,
  compress, or move anything inside them. If a production copy is needed (e.g. brand assets in
  `public/brand/`), **copy**, never move.
- `resources/products/<category>/<product-N>/` contains product photos/videos and supplier
  screenshots. Screenshots are the source of truth for product data (title, price, SKU, category,
  description, specs, variants). **Never invent missing product information** — if a field isn't
  clearly visible in the source images, use `null`/`undefined` rather than guessing.
- `resources/reference-theme.png` and `resources/reference-theme.pdf` are the **authoritative
  layout blueprint** — a "TimTom"-style e-commerce homepage. Reproduce its structure closely
  (proportions, header/nav structure, hero sizing, grid density, card anatomy, footer structure —
  see `docs/DESIGN-SYSTEM.md` §2/§9), not just "inspired by." Its own content, copy, and
  kids-brand illustration style do not carry over — only structure, and the approved storefront
  palette (`docs/DESIGN-SYSTEM.md` §3) replaces its color treatment.
- The verified product catalog lives in `src/data/products.ts` (21 products extracted from
  `resources/products/` — see `docs/PRODUCT-DATA.md` for the full extraction summary, field
  coverage, and known source-data issues). Every entry carries a `source` (`ProductSourceProvenance`
  in `src/types/product.ts`) pointing back to the exact source folder/screenshot it came from —
  keep that link intact when editing entries, and add a `dataQualityNotes` entry instead of
  silently "fixing" anything that looks inconsistent in the source (e.g. a title/photo mismatch).
  `pricing.wholesalePrice` is the supplier's cost; `regularPrice`/`sellingPrice` stay `null` and
  `status` stays `"draft"` until the business actually sets customer-facing prices.
- Only product **photos** (`image-*`) get copied into `public/products/` for storefront use.
  Supplier **screenshots** (`screenshot-*.png`) stay in `resources/` only — they show a different
  platform's branding/UI and must never be copied into `public/`.

## Branding rules

- `assets/*.png` are the **official, final** Renvura brand files (logo, app icon, favicon, banner,
  profile — each in light/dark variants). Do not redesign, regenerate, or replace them with text/
  emoji placeholders.
- Production copies live in `public/brand/` (same filenames). Reference them via
  `src/config/brand.ts` (`brand.assets.*`), not hardcoded paths, so there's one place to update.
- Pick the light/dark variant based on the background it sits on; never stretch or distort;
  preserve proportions. The logo PNGs are opaque lockups (a solid navy/cream rectangle is baked
  into the file). Concretely: `Header` (light) uses `logo-light.png`; `Footer` (dark by design)
  uses `logo-dark.png` — the footer's dark surface is no longer exactly `brand-navy` (see below),
  so the blend is close but not bit-for-bit exact; see `docs/DESIGN-SYSTEM.md` §4 for the tradeoff.
- Derived brand colors (sampled directly from the asset pixels, not guessed):
  navy `#11253C`, cream `#F7F1E5`, gold `#CDAF80`. **These are secondary brand accents only** —
  the logo lockups, plus exactly one restrained touch each (footer divider dot, announcement bar
  truck icon). The primary interactive/surface palette is the approved storefront palette (indigo
  `#5046E5`/`#4338CA` for buttons, links, and focus rings; slate neutrals for
  background/foreground/border; amber `#F59E0B` for sale/discount badges; near-black
  `#101727`/`#1C2333` for dark surfaces like the footer and announcement bar). Don't overuse gold
  or navy — the interface should read as clean and commerce-focused, not jewelry/luxury pastiche.
  See `docs/DESIGN-SYSTEM.md` §3 for the full token table.

## UI / storefront component rules

- `docs/DESIGN-SYSTEM.md` is the source of truth for tokens, typography, and every shared
  component's rules (Header, Footer, AnnouncementBar, ProductCard, Price, Badges, mobile nav) —
  read it before adding to or changing any of them, and update it when you do.
- `ProductCard`/`Price`/`Badges` only render fields the `Product` type actually has verified data
  for. Never add ratings, review counts, "Best Seller"/"Trending"/"Hot" badges, or fake discount
  badges — if the data model doesn't support a claim, don't display it.
- `Price` never displays `pricing.wholesalePrice` to a customer — that's Renvura's cost, not a
  selling price. When `sellingPrice` is `null` it renders "Price unavailable", which is the
  correct/expected state for every current product until Phase 2's pricing gap is resolved. This
  extends to structured data too: `/products/[slug]`'s Product JSON-LD never reads
  `wholesalePrice`, and omits the entire `offers` object (not just `price`) when `sellingPrice` is
  `null` — a priceless `Offer` is itself a form of fabricated-looking data. It also extends to the
  cart (Phase 7): `CartItem.sellingPrice` (`src/types/cart.ts`) is only ever populated from a real,
  non-null `sellingPrice` — `CartContext`'s `addItem` reducer path defensively rejects `null`/
  invalid adds as a second line of defense beyond the UI's own disabled-button gating, so an
  invalid cart line can never be constructed even by a mis-wired caller.
- **Client cart/wishlist state is untrusted** (`src/contexts/CartContext.tsx`/
  `WishlistContext.tsx`, Phase 7): `localStorage`-persisted cart/wishlist data is a **display
  convenience only**, never a source of truth. As of Phase 8, `createOrder`
  (`src/actions/orders.ts`) actually enforces this — see "Checkout & order rules" below. Corrupt or
  wrong-shape stored data (`src/lib/local-storage.ts`'s type-guarded read) is discarded, not
  trusted either.
- `src/app/ui-preview/` is a **temporary, noindex, dev-only** route for visually verifying the
  design system. It must be removed or gated before production deployment — never link to it from
  real pages, and don't treat its existence as permission to skip building real pages later.
- **Listing filters/sort** (`/shop`, `/electronics-gadgets`, `/health-beauty`,
  `getProductListing()` in `src/services/products.ts`): never filter or sort on
  `pricing.wholesalePrice` — only `sellingPrice`. A filter or sort control (price sort, "in stock
  only") should only render in the UI once the current data actually has variance for it to act
  on (e.g. `products.some(p => p.pricing.sellingPrice !== null)`) — build the real code path, but
  don't show a control that would currently do nothing. This mirrors the existing `Price`/`Badges`
  "gracefully omit, never fabricate" pattern; see `docs/DESIGN-SYSTEM.md` §10.

## Checkout & order rules (Phase 8)

- **`createOrder` never trusts a client-submitted price, subtotal, or total.** Only
  `productId`/`quantity` are read from the client cart; `recalculateOrder`
  (`src/actions/order-logic.ts`) re-fetches every product from the trusted server-side catalog
  and recomputes `unitPrice`/`lineTotal`/`subtotal`/`deliveryFee`/`total` from scratch, using the
  same purchasability formula as everywhere else (`sellingPrice !== null && status !==
  "out_of_stock"`) — extend this same distrust to any future order-mutation code path (refunds,
  admin edits, etc.), never accept a client-provided final price as authoritative.
- **`wholesalePrice` must never appear in `Order`, anywhere.** `src/models/Order.ts`'s
  `orderItemSchema` only ever stores `unitPrice` (the real `sellingPrice` at order time). This
  extends the existing wholesalePrice-privacy rule from product pages/cart to orders.
- **Delivery fee is business-approved.** `src/config/delivery.ts`'s `deliveryFees`: ৳80 inside
  Dhaka, ৳150 outside Dhaka (`DELIVERY_FEE_CONFIG_IS_FINAL = true`), paid by the customer and
  added to the product subtotal to produce the order total. Don't change these numbers without an
  actual business decision to do so.
- **Manual payment only — no gateway exists.** bKash/Nagad/Rocket collect a Transaction ID and
  land in `payment.status: "pending_verification"`; nothing is ever marked `"paid"`
  automatically. Manual payment numbers come from `NEXT_PUBLIC_BKASH_NUMBER`/
  `NEXT_PUBLIC_NAGAD_NUMBER`/`NEXT_PUBLIC_ROCKET_NUMBER` (`src/config/payment.ts`) — never
  hardcode a payment number in a component; a method with no configured number must render
  disabled, not with a blank/fabricated number.
- **Order/payment status enums are fixed** (`src/types/order.ts`): `OrderStatus` = `pending` |
  `confirmed` | `processing` | `supplier_submitted` | `shipped` | `delivered` | `cancelled` |
  `returned` (new orders start `pending`; `supplier_submitted` is internal — always show the
  `ORDER_STATUS_LABELS` customer-facing label, never the raw enum value); `PaymentStatus` =
  `unpaid` | `cod_pending` | `pending_verification` | `paid` | `failed` | `refunded` (COD starts
  `cod_pending`, manual methods start `pending_verification`).
- **Idempotency is required for any new order-mutating entry point.** `createOrder` requires a
  client-generated `idempotencyKey` (unique-indexed on `Order`) and treats a repeat call with the
  same key as "return the existing order," not "create another one."
- **Order numbers, not Mongo `_id`s, are customer-facing.** `generateOrderNumber()`
  (`src/services/orders.ts`) produces `RV-YYYYMMDD-XXXXXX`, collision-checked against the DB.
  Never expose a Mongo `_id` in a URL, response, or UI.
- **`/track-order` and `/order-success/[orderNumber]` return sanitized projections only**
  (`toTrackingSummary`/`toOrderSummary`) — no Mongo `_id`, no `idempotencyKey`; the tracking
  projection additionally omits the Transaction ID and the full address (division/district/
  upazila only). `trackOrder` returns the identical generic "no matching order" message whether
  the order number doesn't exist or the phone is wrong — never reveal which one failed.
- **Rate limiting is interim/process-local** (`src/lib/rate-limit.ts`) — it protects against a
  single client hammering one warm instance, not distributed abuse. Don't treat it as sufficient
  for a real production launch without adding a distributed limiter in front of it.

## Authentication & customer account rules (Phase 9)

- **Session identity is always server-derived, never trusted from the client** — the same rule
  `createOrder`'s price recalculation already follows, extended to "who is this." `getCurrentUser()`
  (`src/lib/auth-session.ts`) is the *only* place server code should call `auth.api.getSession()`
  directly; every other file (Server Components, Server Actions) calls `getCurrentUser()` instead.
  It returns just `{ id, name, email, phone } | null` — **never** the raw session object, which
  carries the session token. Passing the raw session into a Client Component would leak that
  token into the RSC payload, the same class of leak this project already fixed once for
  `wholesalePrice` — don't reintroduce it for auth data.
- **`Order.customerUserId` and every `Address.userId` are always derived server-side from the
  session**, never accepted as a client-submitted field. `createOrder` sets `customerUserId` itself
  after calling `getCurrentUser()`; every address Server Action
  (`src/actions/addresses.ts`) does the same for `userId`. A session-lookup failure in `createOrder`
  degrades to "treat as guest" — checkout must never depend on the auth subsystem being healthy.
- **Ownership checks return "not found," never "forbidden," on a mismatch.** Updating/deleting/
  setting-default on another user's address, or viewing another user's order at
  `/account/orders/[orderNumber]`, must look identical to that resource simply not existing — never
  reveal that a resource exists but belongs to someone else.
- **Route protection is layered, not client-side-only**: `proxy.ts` does a fast,
  cookie-*presence*-only redirect for `/account/*` (no DB call, not authoritative);
  `src/app/account/layout.tsx` does the real `getCurrentUser()` check behind it. Never rely on the
  proxy check alone, and never gate real data behind only a client-side redirect.
- **The header's account widget (`HeaderAccountLink.tsx`) reads session client-side via Better
  Auth's `useSession()` hook, not a server-fetched prop from `Header.tsx`.** This is deliberate —
  `Header` renders on every storefront page, and adding `headers()`/`cookies()` there would force
  previously-static pages (`/`, `/shop`, etc.) into dynamic rendering. Keep this split: session
  *display* in shared chrome stays client-side (same "untrusted, display-only" treatment as
  cart/wishlist counts); every *protected read* stays server-side and independently re-validated.
- **Division/District/Upazila validation for addresses reuses
  `checkBangladeshLocationRelationship`** (`src/lib/bangladesh-address-validation.ts`) — the same
  function `order-schema.ts` uses. Don't reimplement this check a third time.
- **Historical guest-order linking is out of scope** — do not add a "claim my past orders by
  email" feature without the user explicitly asking for it and specifying stronger verification
  (e.g. order number + matching phone), per the Phase 9 brief's own stated preference.
- **Email is read-only on `/account/profile`** — there is no verified email-change flow. Don't add
  an editable email field until one exists.
- **`phone` on the Better Auth `user` model has no server-side format validation** — profile
  updates go through `authClient.updateUser()` directly (the correct, idiomatic way to mutate an
  `additionalFields` entry), which only gets client-side `normalizeBdPhone` validation before the
  call. This is an accepted, documented tradeoff for self-owned low-stakes profile data — don't
  extend the same casualness to anything that isn't purely self-owned.
- **Better Auth has its own rate limiting** (enabled in `src/lib/auth.ts`, layered on top of its
  already-strict default `/sign-in/email` limit) — like `src/lib/rate-limit.ts`, it's in-memory and
  process-local; the same "not sufficient alone for production" caveat applies.
- **Origin/CSRF checks stay on — never `disableOriginCheck`/`disableCSRFCheck`.** `baseURL`
  (`process.env.BETTER_AUTH_URL`) must be the exact scheme+host the request actually arrives on —
  Vercel Production must have it set to `https://renvura.com` (no trailing slash), not left unset
  (Better Auth then guesses from the request, which behind Vercel's proxy can resolve to the wrong
  internal origin and reject every state-changing request with "Invalid origin") and not a preview
  URL. `PRODUCTION_TRUSTED_ORIGINS` in `src/lib/auth.ts` additionally trusts `https://www.renvura.com`
  as its own origin (apex and `www` are different origins to a browser's `Origin` header) and acts
  as a safety net if `baseURL` is ever misconfigured — it's a small, explicit, version-controlled
  list, not an env-driven or wildcard allowlist. Local dev is unaffected (`baseURL` is
  `http://localhost:3000` there); Vercel Preview deployments get their own per-deployment origin
  that isn't in this list and isn't currently supported — not needed today, but worth knowing if
  someone tries to sign up from a preview URL and hits the same error.

## Admin dashboard & authorization (Phase 10)

- **Role model**: a `role` field (`"customer" | "admin"`, default `"customer"`) lives on Better
  Auth's `user` document via `additionalFields` in `src/lib/auth.ts`, declared `input: false` —
  this strips `role` from every client-reachable schema (sign-up, `authClient.updateUser()`) at
  Better Auth's own validator-generation level, so a forged `{role:"admin"}` payload is rejected
  before any handler runs. There is no Server Action or API route that can set it.
- **Bootstrap**: the only sanctioned way to grant/revoke admin is `scripts/promote-admin.ts`,
  run manually by a trusted operator with direct database access (`npm run admin:promote --
  someone@example.com` / `npm run admin:demote -- someone@example.com`). It writes directly to
  the native `user` collection with the MongoDB driver, bypassing Better Auth's HTTP API on
  purpose. The target user must already have a normal customer account (sign up first). No email
  is ever auto-promoted based on a hardcoded list.
- **Authorization is layered, matching the existing `/account/*` pattern**: `proxy.ts` does a
  fast, cookie-presence-only redirect for `/admin/*` (not role-aware); `src/app/admin/layout.tsx`
  does the real `getCurrentUser()` + `role === "admin"` check and renders `notFound()` — not a 403
  — for a signed-in non-admin, so a customer account can't even confirm the route exists (mirrors
  `/account/orders/[orderNumber]`'s existing ownership-mismatch handling). `getCurrentUser()`/
  `getCurrentAdmin()`/`requireAdmin()` (`src/lib/auth-session.ts`) are the only place server code
  calls `auth.api.getSession()`. **Every admin Server Action independently calls `requireAdmin()`
  again at the top of its own body** — never assume the layout already ran, since a Server Action
  is a real HTTP endpoint reachable directly regardless of what rendered the page that would
  normally call it.
- **Product/Category catalog is now MongoDB-backed, not static data.** `src/services/products.ts`
  reads `ProductModel`/`CategoryModel` for every storefront and admin read; `src/data/products.ts`/
  `categories.ts` are the original human-verified record only, migrated one time into Mongo by
  `scripts/seed-catalog.ts` (idempotent — never overwrites existing DB docs unless run with
  `--force`). Admin product/category writes (`src/actions/admin/products.ts`/`categories.ts`) go
  through the same `ProductModel`/`CategoryModel`, so there is exactly one source of truth the
  storefront and the admin dashboard both read — this is *not* the "static data the storefront
  would ignore" hybrid the Phase 10 brief warned against. Admin-created products have no
  `source` provenance (that field stays reserved for the original supplier-screenshot-extracted
  catalog) and no `wholesalePrice` (a product created directly through the admin has no wholesale
  cost to record).
- **`wholesalePrice` stays admin-only, never client-bundled.** The product edit page
  (`src/app/admin/products/[slug]/edit/page.tsx`) is a Server Component that renders the wholesale
  cost as plain server-rendered text; the interactive `ProductForm` Client Component never
  receives it as a prop. Admin writes never touch `pricing.wholesalePrice` (`updateProductForAdmin`
  updates only `pricing.regularPrice`/`sellingPrice`/`discountPercentage` via dot-path `$set`,
  leaving `wholesalePrice` untouched) — there is no admin UI path that can edit it.
- **Order status is a controlled state machine, not a free-for-all.**
  `ORDER_STATUS_TRANSITIONS`/`canTransitionOrderStatus()` (`src/types/order.ts`) define the only
  legal transitions; `adminUpdateOrderStatus` (`src/actions/admin/orders.ts`) checks a raw status
  string against the full enum *and* against this transition table before writing, and appends a
  `statusHistory` entry (`{status, changedAt, changedBy}`) rather than replacing history. Extend
  this table, don't bypass it, if a new workflow requirement appears.
- **Payment verification only ever moves `pending_verification` → `paid`/`failed`**
  (`src/actions/admin/payments.ts`). Cash on Delivery orders (`cod_pending`) can never reach this
  queue — `getPendingVerificationOrders` filters on `payment.status: "pending_verification"` only,
  a status COD orders never have.
- **Revenue/analytics definitions are deliberately conservative** — see the doc comments on
  `getOrderDashboardStats`/`getAverageOrderValue`/`getSalesByDay` in `src/services/orders.ts`.
  "Revenue" counts only orders that are `payment.status: "paid"` (manually verified bKash/Nagad/
  Rocket) or `orderStatus: "delivered"` (the conservative proxy for a completed COD sale, since
  there's no separate "cash collected at delivery" confirmation step yet) — a `pending`/
  `confirmed`/`processing`/`shipped` order, cancelled or returned order, or unverified manual
  payment is never counted as revenue. A customer's "Total Delivered Order Value"
  (`src/services/customers.ts`) uses a narrower, more literal definition — `orderStatus ===
  "delivered"` only, not also `paid` — so don't expect the two numbers to reconcile exactly; each
  answers a slightly different question. "Top Products" reads `unitsSold`/`revenue` straight off
  each order's own `items[].titleSnapshot`/`slug`/`lineTotal` (no join back to the live `Product`
  collection), excluding only `cancelled` orders.
- **`StoreSettings` is a DB-backed singleton** (`src/models/StoreSettings.ts`, one document keyed
  by `singletonKey: "store"`, upserted into existence on first read) — `storeName`,
  `supportEmail`/`supportPhone`, `insideDhakaDeliveryFee`/`outsideDhakaDeliveryFee`,
  `lowStockThreshold`. This supersedes `src/config/delivery.ts`'s static `deliveryFees` constant as
  the *runtime* source of truth for checkout — that file now only supplies the fallback values
  used the very first time the singleton is created. `/admin/settings/delivery` is the one write
  path (`adminUpdateStoreSettings`), and `recalculateOrder`/checkout always read the live
  `getDeliveryFees()` value, so there is never a second, conflicting fee source. Manual payment
  numbers (`NEXT_PUBLIC_BKASH_NUMBER` etc.) and all real secrets (`MONGODB_URI`,
  `BETTER_AUTH_SECRET`) stay env-only, deliberately never migrated into `StoreSettings` — don't add
  them there later without a real reason to change that split.
- **Admin audit trail** (`src/models/AdminAuditLog.ts`, `src/services/audit-log.ts`): every
  order-status change, payment verification, product/category/inventory/homepage/settings write
  calls `recordAuditLog({adminUserId, action, entityType, entityId, before, after})` right after
  the write succeeds. Append-only, narrow hand-picked `before`/`after` snapshots (never a full
  document dump, never a secret/token) — extend this same pattern to any new admin mutation.
- **Customers are Better Auth `user` documents, not a separate model.**
  `src/services/customers.ts` queries the native `user` collection via `authDb`
  (`src/lib/auth.ts`) with an explicit `{_id, name, email, phone, createdAt}` projection — never
  the full document — so password/session data (which lives in Better Auth's separate `account`/
  `session` collections anyway) can't leak through this path even by accident.
  `/admin/customers/[userId]` shows profile, saved addresses, and order history; there is
  deliberately no "log in as this customer" feature.
- **Homepage featured-product/category-order curation is real, not cosmetic.**
  `Product.featured` and `Category.displayOrder` (both Phase 10 fields) are exactly what
  `src/app/page.tsx` already reads (`activeProducts.filter(p => p.featured)` with a fallback slice
  when nothing's marked yet; `getAllCategories()` already sorts by `displayOrder` in the Mongo
  query) — `/admin/homepage`'s toggles write the same fields the storefront renders from, with
  `revalidatePath("/")` for near-instant effect on top of the homepage's 60s ISR ceiling.
- **Known Phase 10 limitations** (deferred, not forgotten): no automated test suite exists in this
  repo (no Jest/Vitest/Playwright configured) — Phase 10 authorization/mutation/regression
  verification was done via `tsc`/`eslint`/`next build` plus manual/browser verification, not a
  committed test file; there is no product image upload UI (image/thumbnail fields are plain text
  paths under `/products/`, matching the "no unnecessary media-upload infrastructure" brief); the
  admin dashboard has no bulk-edit/bulk-import tooling; category deletion doesn't exist (only
  activate/deactivate, since existing products may reference a category's slug).

## Customer verification & account recovery (Phase 10.5)

- **Checkout phone OTP is deferred, not built.** An earlier pass of this phase built a full
  session-independent phone-OTP system (`CheckoutPhoneVerification` model, `phone-verification`
  service/actions, `PhoneVerificationSection` UI, an `sms-provider.ts` abstraction) but the
  business decision changed before shipping: **no SMS provider was ever selected, and Renvura
  launches with manual phone/WhatsApp order confirmation instead** (see "Manual order confirmation
  workflow" below). That entire implementation was removed — there is no `CheckoutPhoneVerification`
  collection, no phone-verification Server Actions, no SMS provider code, and no
  `phoneVerificationToken` field anywhere in `order-schema.ts`/`createOrder`. Checkout only
  requires a normalized Bangladesh phone number (`normalizeBdPhone`, unchanged since Phase 8) — no
  proof of control. If phone OTP is revisited later, design it fresh against the actual chosen SMS
  provider rather than resurrecting this removed code.
- **Manual order confirmation workflow (the actual launch process).** Every new order is created
  with `orderStatus: "pending"` exactly as it always has been (see "Checkout & order rules"). Staff
  call or WhatsApp the customer using the phone number on the order to confirm it's genuine before
  fulfillment; `/admin/orders/[orderNumber]`'s existing status-transition UI
  (`ORDER_STATUS_TRANSITIONS`, unchanged) is how an admin then moves it to `confirmed` (verified
  genuine) or `cancelled` (unreachable/fake) — there is no automatic transition out of `pending`.
  This is a process change, not a code change: no new admin feature was needed since the existing
  Phase 10 order-status workflow already supports exactly this.
- **Email verification and password reset use Better Auth's `email-otp` plugin end to end — no
  custom token storage — and this half shipped unchanged from the earlier pass.**
  `src/lib/auth.ts` sets `emailAndPassword.requireEmailVerification: true` (blocks sign-in for
  unverified accounts with a distinct `EMAIL_NOT_VERIFIED` error and skips `autoSignIn` at signup —
  both confirmed directly from Better Auth 1.6.26's `sign-in.mjs`/`sign-up.mjs`),
  `emailAndPassword.revokeSessionsOnPasswordReset: true`, and
  `emailVerification.autoSignInAfterVerification: true`. The `emailOTP()` plugin is configured with
  `overrideDefaultEmailVerification: true`, which routes signup's built-in verification email
  through the OTP sender instead of a link — `sendVerificationOnSignUp` is deliberately left unset
  since that option's own send hook is unreachable once the override is on (see the plugin's
  `hooks.after[0].matcher` in `node_modules/better-auth/dist/plugins/email-otp/index.mjs`).
  `authClient.emailOtp.{sendVerificationOtp, verifyEmail, requestPasswordReset, resetPassword}`
  (`src/lib/auth-client.ts`'s `emailOTPClient()`) back `/verify-email`, `/forgot-password`, and
  `/reset-password`. All OTP state (expiry, attempts, storage) lives in Better Auth's own
  Mongo-backed `verification` collection — no new Mongoose model was needed for this half.
  `storeOTP: "encrypted"` (XChaCha20-Poly1305, keyed by `BETTER_AUTH_SECRET`, never stored in
  Mongo) plus `resendStrategy: "reuse"` means a repeat request for the same purpose (resend
  button, a second `/forgot-password` visit) extends the same still-valid code's expiry instead
  of minting a competing one — every email sent for one attempt carries the identical code, so
  there's no more "only the newest email's code works" confusion. This was deliberately chosen
  over `storeOTP: "hashed"` (Better Auth's `defaultKeyHasher` is an unsalted/unkeyed SHA-256 of a
  6-digit OTP — trivially brute-forceable by anyone with Mongo read access, so for this specific
  keyspace `"encrypted"` is a strictly stronger guard against a DB-only compromise, not a
  tradeoff) — confirmed by reading the installed `better-auth@1.6.26` source directly
  (`dist/plugins/email-otp/otp-token.mjs`'s `retrieveOTP`/`tryReuseOTP`, `dist/crypto/index.mjs`'s
  `symmetricEncrypt`/`symmetricDecrypt`), not assumed from docs. Falls back to generating a
  genuinely new code once the existing one expires or exhausts `allowedAttempts` — reuse never
  extends a code indefinitely past either of those limits.
- **`/email-otp/request-password-reset` always returns the same generic response regardless of
  whether the email has an account** (confirmed in `email-otp/routes.mjs`) — `ForgotPasswordForm.tsx`
  relies on this and never adds its own branching that could leak account existence.
  `sendAccountEmail` (`src/lib/email-provider.ts`) is deliberately written to never throw for a
  delivery-failure case for the same reason: throwing would surface a different HTTP response only
  when a real account was found, which is itself a leak.
- **No existing user is ever retroactively marked `emailVerified: true`.** Turning on
  `requireEmailVerification` doesn't touch existing accounts' data — it only changes what's
  enforced at sign-in from now on. Per this codebase's existing "never fabricate data" principle
  (prices, reviews, stock — see "Architecture rules" above), pre-Phase-10.5 accounts are **not**
  mass-migrated to verified; they see the same "Please verify your email to continue" + Resend flow
  as any unverified account on their next sign-in attempt. This is a one-time, fully self-service
  inconvenience, never a hard lockout.
- **Password reset rejects reusing the current password.** Better Auth 1.6.26 has no native option
  for this (confirmed by reading both `resetPasswordEmailOTP` and the session-based `changePassword`
  in `node_modules/better-auth` — neither compares old vs. new). `rejectSamePasswordOnReset`
  (`src/lib/auth.ts`) is a top-level `hooks.before` middleware matched on
  `/email-otp/reset-password` that calls `ctx.context.password.verify()` — Better Auth's own
  verification primitive, the same one `changePassword` uses — against the account's existing
  credential hash. No second hashing scheme, no plaintext DB comparison. It runs *before* Better
  Auth's route handler, so a rejected same-password attempt never consumes the OTP (`atomicVerifyOTP`
  hasn't run yet) — the customer can retry with a different password on the same code. Surfaces as
  `SAME_AS_CURRENT_PASSWORD`, mapped in `ResetPasswordForm.tsx` to "Your new password cannot be the
  same as your current password."
- **Resend is the one transactional email provider, called from exactly one module.**
  `src/lib/email-provider.ts` is the only file that ever imports `resend` — `sendAccountEmail`
  (email verification / password reset OTPs, called by the Better Auth plugin above) and
  `sendOrderConfirmationEmail` (below) both funnel through its private `sendEmail()` primitive,
  which is the sole call site of `resend.emails.send()`. Configured via `RESEND_API_KEY` (secret,
  server-only, never `NEXT_PUBLIC_*`), `EMAIL_FROM_ADDRESS` (defaults to
  `"Renvura <no-reply@renvura.com>"` if unset), `EMAIL_REPLY_TO` (defaults to `hello@renvura.com`
  if unset). **Unconfigured today** — no Resend account/API key has been provided, and the
  `renvura.com` sending domain has not yet been verified in Resend; see "Known Phase 10.5
  limitations" below. In production with no key set, sending fails closed (logged server-side, no
  fake "sent" response); in development, the full email content (subject + text body) is logged to
  the server console instead of actually sending, gated strictly behind `NODE_ENV !== "production"`.
- **Order confirmation email (new): `sendOrderConfirmationEmail`, fired from `createOrder` via
  Next's `after()`, never blocking or affecting the order response.** Only when
  `input.customer.email` is present — checkout email stays fully optional, guest and logged-in
  alike, and a missing email is not an error. `after()` (`next/server`, stable since Next 15.1,
  used here inside the `createOrder` Server Function) schedules the send to run *after* the
  order-creation response has already gone back to the browser, so a slow or failed Resend call can
  never delay placing the order or make a real, persisted order look like it failed — order
  persistence in `insertOrder` is authoritative and is never rolled back for an email failure.
  Content comes from the sanitized `OrderSummary` projection only (never the raw DB record), so
  `wholesalePrice`, the Mongo `_id`, `idempotencyKey`, `customerUserId`, and `statusHistory` are
  structurally impossible to leak into the email, not just manually avoided. The subject is always
  `"Renvura Order Received — {orderNumber}"` — orders stay `pending` until a human confirms by
  phone/WhatsApp (see above), so the email never claims the order is "confirmed."
- **Order-confirmation-email idempotency is structural, not a status check.** `scheduleOrderConfirmationEmail`
  (`src/actions/orders.ts`) is called from exactly one place: immediately after a *genuinely new*
  `insertOrder()` call succeeds. `createOrder`'s existing idempotency-key early return (a retried
  submit with the same key) and its race-loser early return (two near-simultaneous submits) both
  return *before* that call site, so neither path can ever schedule a second email for the same
  order — no separate "was this already sent" check was needed. `Order.notifications.orderConfirmationEmail`
  (`src/models/Order.ts`) still records the one attempt's outcome (`"not_applicable"` |
  `"pending"` | `"sent"` | `"failed"`, plus `sentAt`/`providerMessageId`/a truncated `lastError`)
  purely for admin visibility/future troubleshooting — it is not itself the dedupe mechanism.
  `providerMessageId` (Resend's own email id) is admin-only: present on `AdminOrderDetail`, absent
  from `OrderSummary`/`OrderTrackingSummary`.
- **Known Phase 10.5 limitations (deferred, not forgotten)**: phone OTP verification (see above —
  revisit once an SMS provider is actually chosen); the `renvura.com` domain is not yet verified in
  Resend and no `RESEND_API_KEY` has been issued, so real email delivery does not work yet in any
  environment; there is no automated retry/queue for a failed order-confirmation email — a
  permanently-`"failed"` (or stuck-`"pending"` from a mid-flight crash) row is visible to an admin
  reading the DB directly today, but there is no `/admin` UI surfacing it and no retry button; this
  is intentionally out of scope until real delivery is verified and worth building a queue for.

## Analytics & measurement (Phase 11)

- **Scope**: Meta Pixel (browser) + Meta Conversions API (server) + Google Analytics 4 only.
  Explicitly NOT built: Google Ads conversion tracking, TikTok Pixel, Microsoft Ads, email
  marketing automation, CRM integrations, courier integration, an automated payment gateway, an
  attribution platform, or server-side GTM — don't add any of these without a fresh scoping
  conversation.
- **Centralized architecture, never scattered raw calls.** Every `fbq()`/`gtag()`/Meta Graph API
  call lives in `src/lib/analytics/` — `config.ts` (env/enablement, the one place that reads
  `NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_GA_MEASUREMENT_ID`/`META_CAPI_ACCESS_TOKEN`/etc.),
  `event-types.ts` (shared event payload shapes), `event-id.ts` (`purchaseEventId`/
  `randomEventId`), `normalization.ts` (server-only — email/phone normalization + SHA-256 hashing
  for Meta CAPI `user_data`, imports `node:crypto` specifically so a Client Component import fails
  the build instead of silently shipping hashing logic to the browser), `mapping.ts` (the one
  Product/CartItem/OrderItem → `AnalyticsItem` mapping, reused everywhere instead of duplicated per
  component), `meta-client.ts` (browser Pixel wrapper), `ga4-client.ts` (browser gtag wrapper),
  `meta-server.ts` (server CAPI sender). A component that wants to fire an event imports one of the
  `track*` functions from `meta-client.ts`/`ga4-client.ts` — it never touches `window.fbq`/
  `window.gtag` directly.
- **Product identity is the catalog slug, everywhere** (`mapping.ts`) — never a Mongo `_id`, never
  `wholesalePrice`. `AnalyticsItem.price` is always a real, non-null `sellingPrice`/`OrderItem.
  unitPrice`; `productToAnalyticsItem` returns `null` (and the caller skips firing) for a product
  with no selling price yet — this is what keeps the held-back `skin1004-centella-ampoule-100ml`
  from ever producing a misleading value-bearing event, the same "gracefully omit, never fabricate"
  rule already applied to `Price`/`Badges` (see "UI / storefront component rules" above).
- **`event_id` deduplication is Purchase-only.** No other event in this phase has a server CAPI
  counterpart, so only Purchase needs a deterministic id shared between browser and server:
  `purchaseEventId(orderNumber) = "purchase:{orderNumber}"` (`event-id.ts`) — never the Mongo
  `_id`, never a timestamp (a timestamp would differ between the server's CAPI send inside
  `createOrder` and the browser's Pixel fire on `/order-success` moments later, defeating
  deduplication entirely). Every other event gets a fresh `randomEventId()` purely for its own
  identity, not relied on for cross-provider matching.
- **Purchase is server-authoritative, structurally idempotent, and never blocks checkout.**
  `createOrder` (`src/actions/orders.ts`) calls `scheduleMetaPurchaseCapi(order, requestContext)`
  from the exact same genuinely-new-order call site as `scheduleOrderConfirmationEmail` — after
  the idempotency-key early return and the race-loser early return, both of which return before
  this line, so a retried/racing submit can never schedule a second CAPI send for one order. It
  runs inside `after()` (Next's stable post-response hook, same as the confirmation email), so a
  slow/failed Meta API call can never delay or fail order creation — same never-throw,
  never-rollback principle as `sendOrderConfirmationEmail`. `Order.analytics.metaPurchase`
  (`{status, eventId, sentAt}`, Phase 11's analogue to `notifications.orderConfirmationEmail`) is
  set to `"pending"` at insert time when `isMetaCapiConfigured()`, else `"not_applicable"` —
  `eventId` is always the deterministic value regardless, so an admin can always cross-reference
  Meta Events Manager once CAPI is later configured. This is admin-only, never part of
  `OrderSummary`.
- **Purchase value = final order total, including delivery fee**, for both providers — never
  `wholesalePrice`/profit. GA4 additionally reports `shipping: deliveryFee` as a breakout of that
  same total (GA4's own ecommerce semantics support `value` including shipping while also
  reporting it separately); Meta's Purchase schema has no separate shipping field, so `value` is
  simply the total the customer actually paid. `ViewContent`/`AddToCart`/`InitiateCheckout` values
  are `sellingPrice × quantity` (cart-derived, display-only — never authoritative, matching this
  codebase's existing untrusted-client-cart-state rule).
- **The browser Purchase event never trusts `localStorage`.** `/order-success/[orderNumber]`
  (already a Server Component reading the order from MongoDB) passes only a small sanitized shape
  (`eventId`, `orderNumber`, mapped items, `value`, `deliveryFee`) to `PurchaseTracker.tsx` (Client
  Component) — never the raw `OrderSummary`, never anything read from the cart context (which may
  already be cleared by the time this page renders anyway). A `sessionStorage` marker keyed by
  `orderNumber` suppresses a same-tab refresh from re-firing, but this is a UX nicety only —
  correctness against real double-counting comes from Meta's `event_id` dedup and GA4's
  `transaction_id`, not this marker (see its absence in private browsing is explicitly a no-op,
  not a bug).
- **Meta CAPI `user_data` is hashed/omitted, never raw.** `normalization.ts`'s
  `normalizeEmailForHashing` (lowercase + trim) and `normalizePhoneForMeta` (reuses
  `normalizeBdPhone`, then converts local `01XXXXXXXXX` to Meta's required `8801XXXXXXXXX` form —
  no `+`, no punctuation) run before `hashForMeta`'s SHA-256. `client_ip_address`/
  `client_user_agent` come from the actual checkout request's own headers (same trust level as
  `getClientIp()`'s existing `x-forwarded-for` handling for rate limiting); `_fbp`/`_fbc` are read
  from the request's own cookies (set automatically by the Meta Pixel base snippet — never
  fabricated) and simply omitted when absent. None of this is ever logged.
- **PageView/page_view URLs are pathname-only, never the full URL with query string.**
  `RouteTracker.tsx` reads only `usePathname()`, deliberately never `useSearchParams()` — this is
  what keeps `/verify-email?email=...`, `/reset-password?email=...`, and any other PII-bearing
  query string from ever reaching Meta/GA4. `usePathname()` alone needs no Suspense boundary
  (unlike `useSearchParams()`, see `SearchBar.tsx`), so this stays simple. `AnalyticsScripts.tsx`
  fires the very first PageView itself (its own init snippet); `RouteTracker.tsx` explicitly skips
  its own first render (a ref guard) so the initial load is never double-counted, then fires on
  every subsequent client-side navigation.
- **`/track-order` never sends order number + phone to Meta/GA** — that page only gets the generic
  pathname-only PageView like any other route; the lookup form's own submission never triggers a
  separate analytics event.
- **Analytics-disabled is the default until configured**, and is never commerce-critical.
  `isMetaPixelEnabled()`/`isGa4Enabled()`/`isMetaCapiConfigured()` (`config.ts`) each require the
  relevant ID/token to be set — with nothing configured, `AnalyticsScripts.tsx` renders nothing,
  every `track*` call silently no-ops, and `scheduleMetaPurchaseCapi` never even schedules the
  `after()` callback. Locally, analytics additionally requires
  `NEXT_PUBLIC_ANALYTICS_ENABLED=true` even if an ID happens to be present in `.env.local` —
  `NODE_ENV=production` (Vercel Production/Preview) is the only environment where a configured ID
  alone is enough, so `npm run dev` never pollutes real Meta/GA4 data by accident.
- **Meta Test Events**: set `META_TEST_EVENT_CODE` (from Meta Events Manager → Test Events) to have
  `sendMetaCapiPurchase` include `test_event_code` in the CAPI payload — never hardcoded, purely an
  optional env var read at send time.
- **Meta Graph API version is configurable, not memorized.** `meta-server.ts`'s
  `META_GRAPH_API_VERSION_DEFAULT` is a snapshot, not a guarantee — verify against
  https://developers.facebook.com/docs/graph-api/changelog before relying on it in production, and
  override with `META_GRAPH_API_VERSION` if Meta has since deprecated it.
- **Consent gate is a single function today, not a platform.** `isAnalyticsConsentGranted()`
  (`config.ts`) always returns `true` — Bangladesh audience, no GDPR-style consent-banner
  requirement assumed without legal analysis, per the original Phase 11 brief. It's factored out on
  its own specifically so a real consent-management flow can replace just this one function later
  without touching any `track*` call site.
- **`Order.analytics`/`notifications` are the only two places anything Meta/Resend-related is
  persisted** — no request/response bodies, no access tokens, no hashed customer data are ever
  stored; both are thin status records for admin visibility, not event logs.
- **Cancellation/refund attribution is explicitly out of scope for this phase** — no Meta
  refund/cancellation adjustment event is sent when an order transitions to `cancelled`/`returned`.
  Revisit only if asked.

## Design system contrast rule

Muted/secondary text uses a minimum of 70% foreground opacity (`text-foreground/70` or higher on
light backgrounds, `text-brand-cream/70`+ on the navy footer) — verified against WCAG AA
(≈5.8:1 and ≈7.4:1 respectively). Lower values were tried during Phase 3 and failed contrast
checks; don't reintroduce `/40`–`/60` for real (non-disabled) content. The one exception is
genuinely inactive UI (`NavLinks.tsx` can render a `href: null` nav item as an inert "Soon" pill,
though no current nav item uses that path) — WCAG 1.4.3 exempts inactive component text from
contrast requirements, and looking de-emphasized is the intent there.

## Bangladesh localization

BDT currency with `৳` symbol, Cash on Delivery as a first-class payment method (Phase 8), BD phone
number normalization (`src/utils/phone.ts` — accepts `01XXXXXXXXX`/`+8801XXXXXXXXX`/
`8801XXXXXXXXX`, always stores `01XXXXXXXXX`), address structure as Division → District →
Upazila/Thana → Area/Road/House backed by the real, verified hierarchy in
`src/data/bangladesh-locations.ts` (8 divisions, 64 districts, 544 upazila/thana entries including
Dhaka's 50 metropolitan thanas — see that file's doc comment for sourcing; do not hand-edit
individual entries without checking the source), and a Dhaka vs. outside-Dhaka delivery charge
split (`src/utils/delivery.ts`) are all implemented as of Phase 8. Manual bKash/Nagad/Rocket
payment (Transaction ID + manual verification, no gateway) also exists — see "Checkout & order
rules" above. As of Phase 9, saved addresses (`/account/addresses`) reuse this exact same
hierarchy and validation — see "Authentication & customer account rules" below; never duplicate
the location data or its dependent-select validation logic. Courier API integration and an
automated payment gateway (e.g. SSLCommerz) still come later — don't hardcode a specific provider
prematurely.

## Marketing / tracking / SEO

Meta Pixel + Conversions API and GA4 are implemented as of Phase 11 — see "Analytics &
measurement (Phase 11)" above. Still future-ready but NOT implemented: GTM (direct gtag/fbq is
used instead, deliberately — see Phase 11 section), Google Ads conversion tracking, TikTok Pixel,
Microsoft Ads, an internal order-lifecycle event bus, email marketing automation, and CRM
integrations — don't wire any of this up until asked. SEO: Next.js Metadata API, canonical URLs,
sitemap, robots.txt, Open Graph, JSON-LD Product schema are already implemented (Phases 3–6); a
sitemap.xml/robots.txt route has not been added — don't design yourself into a corner that makes
it hard later.

## Coding standards

- Strict TypeScript, no `any` without a strong reason.
- Don't add dependencies beyond what's actually needed for the current task.
- Don't add error handling/fallbacks for scenarios that can't happen; validate at real
  boundaries (user input, external APIs, supplier data parsing).
- Prefer editing existing files over creating new ones.

## Current status / what NOT to build yet

Phases 1 (Foundation), 2 (Product data model), 3 (Global storefront design system, including a
redesign pass that pulled Phase 4's homepage forward into the same pass), 4 (Homepage refinement —
Category Highlights, Why Shop With Renvura, homepage SEO metadata), 5 (Shop/category listing —
`/shop`, `/electronics-gadgets`, `/health-beauty`, real search), 6 (Product detail —
`/products/[slug]`, gallery, buy box, related products, JSON-LD), 7 (Cart + wishlist — real
client-side state, `/cart`, `/wishlist`, header counts), 8 (Checkout + secure order creation —
`/checkout`, `/order-success/[orderNumber]`, `/track-order`, MongoDB-backed `Order`), 9 (Customer
authentication + accounts — Better Auth email/password, `/login`, `/signup`, `/account/*`, saved
addresses, order history, `Order.customerUserId`), 10 (Admin dashboard + store management —
`/admin/*` role-gated authorization, order/payment management, MongoDB-backed product/category
CRUD, customer/inventory views, homepage curation, `StoreSettings`, analytics, audit log — see
"Admin dashboard & authorization (Phase 10)" above), and 10.5 (Customer verification + account
recovery — Better Auth `email-otp`-backed email verification and forgot/reset password,
`/verify-email`, `/forgot-password`, `/reset-password`, plus a Resend-backed order-confirmation
email; checkout phone OTP was built then explicitly deferred in favor of manual phone/WhatsApp
order confirmation — see "Customer verification & account recovery (Phase 10.5)" above), and 11
(Analytics & measurement — Meta Pixel, Meta Conversions API, GA4, `event_id` Purchase
deduplication — see "Analytics & measurement (Phase 11)" above) are done —
see `docs/PRODUCT-ROADMAP.md`, `docs/PRODUCT-DATA.md`, `docs/ARCHITECTURE.md`, and
`docs/DESIGN-SYSTEM.md` §§9–14. The reusable UI shell, homepage, listing pages, product detail
page, cart/wishlist, checkout/order creation/tracking, customer accounts, the admin dashboard, and
analytics measurement exist and are wired in, but do not build an automated payment gateway
(bKash/Nagad/Rocket APIs), courier API integration, Google Ads conversion tracking, TikTok Pixel,
Microsoft Ads, email marketing automation, CRM integrations, server-side GTM, Meta refund/
cancellation attribution, historical guest-order linking,
a verified email-*change* flow (email *verification* itself is done, see Phase 10.5 — "email is
read-only on `/account/profile`" from Phase 9 still holds), social login, checkout phone OTP
verification (deferred — see Phase 10.5), account phone-update verification, "log in as customer"
impersonation, product image upload UI, bulk product import/export, an automated test suite, an
automated email-retry queue, or advanced accounting/multi-vendor/warehouse features until asked.
`Product`/`Category` MongoDB models are connected as of Phase 10 (see above) — `Order` (now
carrying `notifications.orderConfirmationEmail` from Phase 10.5 and `analytics.metaPurchase` from
Phase 11), `Address`, `AdminAuditLog`, and
`StoreSettings` are also connected, plus Better Auth's own `user`/`session`/`account`/`verification`
collections. No Resend account/API key is configured yet — see Phase 10.5's "fail closed in
production" note above; this blocks real email delivery (verification, password reset, and order
confirmation alike) until `RESEND_API_KEY` is set and the `renvura.com` domain is verified in
Resend. No Meta Pixel ID, Meta CAPI access token, or GA4 Measurement ID is configured yet either —
see "Analytics & measurement (Phase 11)" above for what's needed before real Meta/GA4 delivery can
be verified. Do not wire up real newsletter logic, or
create fake products/reviews/prices. 20 of the 21 catalog products have real approved `sellingPrice`
values; `skin1004-centella-ampoule-100ml` is deliberately held back (`sellingPrice: null`,
unpublished) pending a 30ml/100ml source-data mismatch — "Price unavailable" and disabled Add to
Cart/Buy Now are the correct, expected state for that one product only, not the whole catalog.
Delivery fee amounts (৳80 inside Dhaka, ৳150 outside Dhaka) are business-approved starting values;
as of Phase 10 the live, editable source of truth is the `StoreSettings` singleton
(`/admin/settings/delivery`), not `delivery.ts`'s static constants — see "Checkout & order rules"
and "Admin dashboard & authorization (Phase 10)" above. Confirm scope with the user before starting
a new phase.
