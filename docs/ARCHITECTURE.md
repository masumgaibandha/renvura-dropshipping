# Architecture

Status: **Phase 3 — Global storefront design system**. This document describes the architecture
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
| Data layer | MongoDB Atlas + Mongoose | Schemas defined (`src/models/`); **connection not wired up yet** — current data access reads `src/data/products.ts` |
| API layer (planned) | Next.js Route Handlers | not yet built |
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
│   │   └── shop/                   Listing-page composition (Phase 5): ProductListingPage,
│   │                                SortSelect, MobileFilterDrawer — see docs/DESIGN-SYSTEM.md §10
│   ├── config/                    brand.ts, navigation.ts
│   ├── data/                       categories.ts, products.ts — verified seed data (Phase 2)
│   ├── hooks/                      Client-side React hooks
│   ├── lib/                         Framework-agnostic utilities (validate-product.ts), DB/client setup
│   ├── models/                       Mongoose schemas: Product.ts, Category.ts (not yet connected)
│   ├── services/                      Data-access layer: products.ts (reads src/data/ for now)
│   ├── types/                          product.ts, category.ts — shared TypeScript domain types
│   └── utils/                          currency.ts, slug.ts, pricing.ts — small pure helpers
├── CLAUDE.md
└── package.json
```

**Layering rule:** UI components render data; `services/` contains business logic and talks to
`models/`; `lib/` holds framework-agnostic helpers (formatting, DB connection, etc.) that both
layers can use. Route Handlers in `src/app/api/**` call into `services/`, not `models/` directly,
once the API layer exists.

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

**Not yet implemented**: `Order` (BD address shape: division/district/upazila, COD vs. online
payment, lifecycle status), `Customer` (guest + registered), `Review`, `Coupon`. These will follow
the same "only model what's needed, don't invent fields ahead of need" approach in later phases.

### Data access — seed data now, MongoDB later

MongoDB is **not connected yet** — `src/models/` defines the schemas but nothing calls
`mongoose.connect()`. Until it does, `src/services/products.ts` reads directly from
`src/data/products.ts` (the verified catalog extracted in Phase 2 — see `docs/PRODUCT-DATA.md`).
The service functions (`getProductBySlug`, `getProductsByCategory`, etc.) are written so that
swapping the implementation to query `ProductModel` later doesn't require changing any caller.

## UI component layer (Phase 3 — done; homepage added in the Phase 3 redesign)

`src/app/layout.tsx` wraps every route in `StoreShell` (`AnnouncementBar` → `Header` →
`SecondaryNav` → `<main>` → `Footer`), so individual pages never re-declare site chrome — a page
component only needs to return its own content. Full rules and rationale for each piece are in
`docs/DESIGN-SYSTEM.md`; the architectural point here is the client/server split:

- Client Components are each for a concrete, stated reason: `SearchBar.tsx` (real navigation to
  `/shop?q=...`, plus `useSearchParams()` to prefill — wrapped in its own `<Suspense>` boundary
  since it renders on every route including statically-prerendered ones) /
  `NewsletterSignup.tsx` (real form, `preventDefault`, no backend yet), `MobileNav.tsx`/
  `MobileFilterDrawer.tsx` (shared drawer open/close state), `NavLinks.tsx` (`usePathname()`-driven
  active link styling), `providers.tsx` (theme context), `CategoryTabs.tsx`/
  `FeaturedProductsRow.tsx` (HeroUI `Tabs` selection state / a scroll-ref for the prev-next
  carousel), and `SortSelect.tsx` (`router.push` on a native `<select>`'s `onChange` — the only
  navigation a `<select>` can't do with a plain `href`). Everything else — `Header`, `Footer`,
  `SecondaryNav`, `ProductCard`, `ProductGrid`, `Price`, `Badges`, `AnnouncementBar`, `Container`,
  `Section`, `IconLinkButton`, `Breadcrumbs`, `HeroBanner`, `BrandStory`, `ProductListingPage` —
  is a Server Component, even where it renders HeroUI components that are themselves Client
  Components internally (Next.js allows a Server Component to import and render a Client
  Component directly; the boundary starts at the child, not the parent).
- `ProductCard`/`Price`/`Badges` read the real `Product` type from Phase 2 and render nothing
  they can't verify (no ratings, no invented badges, "Price unavailable" instead of showing
  `wholesalePrice` as if it were a customer price). Add to Cart is disabled based on real state
  (`sellingPrice === null` or out of stock), not stubbed with a fake handler.
- HeroUI is rethemed via CSS custom properties in `src/app/globals.css` (see
  `docs/DESIGN-SYSTEM.md` §3), not forked or wrapped — `Button`, `Chip`, `SearchField`, `Drawer`,
  `Dropdown`, `Tabs`, `TextField`/`Input` are used directly from `@heroui/react` throughout.

## Bangladesh-specific concerns baked into the architecture

- Currency formatting centralized (via `src/config/brand.ts` currency config) rather than
  hardcoded `$`/`৳` strings scattered through components.
- Address model planned as Division → District → Upazila/Thana, not a generic
  street/city/state/zip shape.
- Delivery pricing logic will need a Dhaka vs. outside-Dhaka branch — this belongs in
  `services/`, not hardcoded in checkout UI.
- Cash on Delivery is a first-class payment method, not an edge case bolted onto an
  online-payment-first flow.

## Marketing / tracking readiness

Pixel/GA4/GTM integration and the internal order-lifecycle events
(`order_created` → `order_confirmed` → `supplier_submitted` → `shipped` → `delivered` /
`cancelled` / `returned`) are not implemented yet, but the service-layer split above is what makes
them addable later without rewiring UI: events fire from `services/`, not from components.

## SEO readiness

Next.js Metadata API is already in use for base metadata (`src/app/layout.tsx`) and per-route
metadata on the homepage and the three Phase 5 listing routes (truthful titles/descriptions,
`alternates.canonical` pointing at the clean query-free path). Canonical URLs and the root
layout's `metadataBase` are gated behind `isConfigured(brand.urls.site)` — wired, but inactive
until a real production domain replaces that `TODO`. Dynamic per-product metadata, `sitemap.ts`,
`robots.ts`, Open Graph images, and JSON-LD `Product` schema are still Phase 12 work, but nothing
in the current structure blocks adding them per-route later.

## Explicitly deferred (not built yet)

The homepage was built ahead of schedule in the Phase 3 redesign, and catalog/category listing
(`/shop`, `/electronics-gadgets`, `/health-beauty`) is done as of Phase 5 (see
`docs/DESIGN-SYSTEM.md` §§9–10 and `docs/PRODUCT-ROADMAP.md`) — still deferred: product detail
pages, cart, checkout, customer accounts, and the admin dashboard. Phase 3 built the **UI
foundation** several of these reuse (`ProductCard`, `ProductGrid`, `Price`, `SearchBar`,
`Header`/`Footer` chrome, the homepage's `home/` components, and now the listing pages' `shop/`
components) but deliberately stopped short of real behavior: Add to Cart doesn't add to a cart,
wishlist doesn't persist, the newsletter form doesn't subscribe anyone. Search itself does now
work (Phase 5) — that's the one exception. The folder structure above exists to receive the rest
of that logic without restructuring — it plugs into
`src/services/` once there's something real to call.
