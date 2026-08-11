# Product Roadmap

This roadmap defines the intended build order. **Phases 1–3 are complete, and Phase 4 (Homepage)
was pulled forward and completed inside Phase 3's redesign pass** (see the Phase 3 entry below for
why). Do not start a later phase without explicit confirmation — each phase should be scoped and
agreed before work begins.

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

## Phase 5 — Categories / product listing
Category and subcategory pages, product grids, filters, sorting, search.

## Phase 6 — Product detail
Product detail page: gallery, variants, specs, related products, structured data.

## Phase 7 — Cart
Cart state, add/remove/update, persistence strategy, wishlist.

## Phase 8 — Checkout / orders
Guest checkout, Bangladesh address form (Division/District/Upazila), Cash on Delivery, online
payment gateway integration (e.g. SSLCommerz), order creation and confirmation.

## Phase 9 — Authentication / customer accounts
Customer registration/login, order history, saved addresses, wishlist persistence.

## Phase 10 — Admin
Admin dashboard: product management, order management, customer management.

## Phase 11 — Tracking / retargeting
Meta Pixel, Meta Conversions API, GA4, GTM, event wiring (PageView, ViewContent, Search,
AddToCart, InitiateCheckout, Purchase) and internal order-lifecycle events.

## Phase 12 — SEO / performance / testing
Dynamic metadata, canonical URLs, sitemap, robots.txt, Open Graph, JSON-LD Product schema, Core
Web Vitals pass, test coverage.

## Phase 13 — Deployment
Production Vercel deployment, environment configuration, domain setup, monitoring.
