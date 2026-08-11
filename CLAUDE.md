# CLAUDE.md

Guidance for Claude Code (and any future session/agent) working in this repository.

## What Renvura is

Renvura is a production-quality, Bangladesh-focused dropshipping e-commerce store. Phase 1
(foundation), Phase 2 (product data model), and Phase 3 (global storefront design system,
including a redesign pass that also built the real homepage — see below) are complete. The
reusable UI (header, footer, product cards, price/badges) and the homepage exist; catalog/category
listing, product detail, cart, checkout, and admin pages are not built yet.

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
- MongoDB / MongoDB Atlas + Mongoose (schemas defined in `src/models/`; **no DB connection wired
  up yet** — current data access reads `src/data/products.ts`)
- Next.js Route Handlers for server-side APIs (not yet built)
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
                             wishlist/ are the Phase 7 routes; ui-preview/ is TEMPORARY — see below
  src/components/ui/       icons.tsx, IconLinkButton.tsx, Breadcrumbs.tsx — small generic primitives
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
  src/components/wishlist/  Wishlist composition (Phase 7): WishlistToggleButton, WishlistCountBadge
  src/contexts/              CartContext.tsx, WishlistContext.tsx (Phase 7) — see the untrusted-
                              client-state rule below
  src/config/               brand.ts, navigation.ts
  src/data/                 categories.ts, products.ts — verified seed data (Phase 2)
  src/hooks/                 client-side hooks
  src/lib/                   framework-agnostic utilities (validate-product.ts, local-storage.ts), DB/client setup
  src/models/                 Mongoose schemas: Product.ts, Category.ts (not yet connected)
  src/services/               data-access layer: products.ts (reads src/data/ until MongoDB is wired up)
  src/types/                  shared TypeScript types: product.ts, category.ts
  src/utils/                  small pure helpers: currency.ts, slug.ts, pricing.ts
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
  convenience only**, never a source of truth. A future checkout/order-creation phase must
  re-fetch and validate price and availability from real product data (or a real backend) before
  creating an order — never trust a stored price/subtotal/quantity directly for that. Corrupt or
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

## Design system contrast rule

Muted/secondary text uses a minimum of 70% foreground opacity (`text-foreground/70` or higher on
light backgrounds, `text-brand-cream/70`+ on the navy footer) — verified against WCAG AA
(≈5.8:1 and ≈7.4:1 respectively). Lower values were tried during Phase 3 and failed contrast
checks; don't reintroduce `/40`–`/60` for real (non-disabled) content. The one exception is
genuinely inactive UI (`NavLinks.tsx` can render a `href: null` nav item as an inert "Soon" pill,
though no current nav item uses that path) — WCAG 1.4.3 exempts inactive component text from
contrast requirements, and looking de-emphasized is the intent there.

## Bangladesh localization

Plan/build for: BDT currency with `৳` symbol, Cash on Delivery as a first-class payment method,
Bangladesh phone number formats, address structure as Division → District → Upazila/Thana, and a
Dhaka vs. outside-Dhaka delivery charge split. Courier and payment gateway (e.g. SSLCommerz)
integration come later — don't hardcode a specific provider prematurely.

## Marketing / tracking / SEO (future-ready, not yet implemented)

Architecture should stay compatible with: Meta Pixel + Conversions API, GA4, GTM, and an internal
order lifecycle (`order_created` → `order_confirmed` → `supplier_submitted` → `shipped` →
`delivered` / `cancelled` / `returned`). SEO: Next.js Metadata API, canonical URLs, sitemap,
robots.txt, Open Graph, JSON-LD Product schema. Don't wire any of this up until the relevant
phase — just don't design yourself into a corner that makes it hard later.

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
`/products/[slug]`, gallery, buy box, related products, JSON-LD), and 7 (Cart + wishlist — real
client-side state, `/cart`, `/wishlist`, header counts) are done — see `docs/PRODUCT-ROADMAP.md`,
`docs/PRODUCT-DATA.md`, and `docs/DESIGN-SYSTEM.md` §§9–12. The reusable UI shell, homepage,
listing pages, product detail page, and cart/wishlist exist and are wired in, but do not build
checkout, order creation, payment, auth, or admin dashboard until asked. Do not connect MongoDB
(schemas exist but aren't wired up), wire up real newsletter logic, or create fake products/
reviews/prices — every product still has `sellingPrice: null`, so "Price unavailable" and disabled
Add to Cart/Buy Now buttons are the correct, expected state everywhere until Phase 2's pricing gap
is resolved. Search (Phase 5) and cart/wishlist (Phase 7) now work end-to-end — those are no
longer stubs, but Phase 7's cart/wishlist state is explicitly untrusted client state (see above),
not a source of truth for a future order. Confirm scope with the user before starting a new phase.
