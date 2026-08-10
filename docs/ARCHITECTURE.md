# Architecture

Status: **Phase 1 — Foundation**. This document describes the architecture put in place during
project initialization, and the architecture the codebase is being kept ready for. See
`docs/PRODUCT-ROADMAP.md` for phasing.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Turbopack by default; see `AGENTS.md` / `CLAUDE.md` for version-16-specific behavior |
| Language | TypeScript (strict) | |
| UI library | React 19 | |
| Styling | Tailwind CSS v4 | CSS-first config in `src/app/globals.css`, no `tailwind.config.js` |
| Component kit | HeroUI v3 (`@heroui/react`, `@heroui/styles`) | React Aria based; no context provider required |
| Theme | `next-themes` | class-based light/dark, see `src/components/layout/providers.tsx` |
| Data layer (planned) | MongoDB Atlas + Mongoose | not yet connected |
| API layer (planned) | Next.js Route Handlers | not yet built |
| Hosting | Vercel | |
| Source control | Git / GitHub | `masumgaibandha/renvura-dropshipping` |

## Folder structure

```
renvura-dropshipping/
├── assets/                  Official Renvura brand source files (read-only)
├── resources/                Reference theme + supplier product source material (read-only)
│   ├── reference-theme.png
│   └── products/
│       ├── electric-product/product-01..10/
│       └── health-beauty/product-01..11/
├── docs/                      This documentation set
├── public/
│   ├── brand/                 Production copies of assets/ (same filenames)
│   └── products/               Reserved for processed/optimized product images (Phase 2+)
├── src/
│   ├── app/                    App Router routes, layouts, metadata
│   ├── components/
│   │   ├── ui/                  Generic/design-system primitives (buttons, inputs, cards…)
│   │   ├── layout/               Header, footer, providers, page shells
│   │   └── ecommerce/            Product cards, grids, cart/wishlist UI, etc.
│   ├── config/                    Static config (brand.ts, site-wide constants)
│   ├── hooks/                      Client-side React hooks
│   ├── lib/                         Framework-agnostic utilities, DB/client setup
│   ├── models/                       Mongoose schemas/models (Phase 2+)
│   ├── services/                      Business logic / data-access layer
│   ├── types/                          Shared TypeScript types
│   └── utils/                          Small pure helper functions
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

## Data model (planned — Phase 2)

Not yet implemented. Expected top-level Mongoose models once MongoDB is wired up:

- `Product` (with variants, category/subcategory refs, stock, supplier source reference)
- `Category` / `Subcategory`
- `Order` (with BD address shape: division/district/upazila, COD vs. online payment, lifecycle
  status)
- `Customer` (guest + registered)
- `Review`
- `Coupon`

Exact schemas will be derived from what's actually extractable from `resources/products/`
screenshots plus store requirements — no fields will be invented ahead of need.

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

Next.js Metadata API is already in use for base metadata (`src/app/layout.tsx`). Dynamic
per-product metadata, canonical URLs, `sitemap.ts`, `robots.ts`, Open Graph images, and JSON-LD
`Product` schema are Phase 12 work, but nothing in the current structure blocks adding them
per-route later.

## Explicitly deferred (not built yet)

Catalog/category pages, search/filter/sort, cart, wishlist, guest checkout, customer accounts,
COD/online payment flows, order tracking, reviews, coupons, related products, and the admin
dashboard are all deferred to later phases per `docs/PRODUCT-ROADMAP.md`. The folder structure
above exists to receive them without restructuring.
