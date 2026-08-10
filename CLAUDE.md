# CLAUDE.md

Guidance for Claude Code (and any future session/agent) working in this repository.

## What Renvura is

Renvura is a production-quality, Bangladesh-focused dropshipping e-commerce store. Phase 1
(foundation) and Phase 2 (product data model) are complete; no storefront UI (homepage, catalog
pages, cart, checkout, admin) is built yet.

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
  src/app/                 routes (App Router)
  src/components/ui/       generic/design-system primitives
  src/components/layout/   header, footer, providers, shells
  src/components/ecommerce/ product cards, grids, cart UI, etc.
  src/config/               brand.ts and other static config
  src/data/                 categories.ts, products.ts — verified seed data (Phase 2)
  src/hooks/                 client-side hooks
  src/lib/                   framework-agnostic utilities (validate-product.ts), DB/client setup
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
- `resources/reference-theme.png` is a visual/layout reference only (a jewelry site). Adapt its
  design language (whitespace, hierarchy, editorial sections, premium feel) — do not copy it
  literally, and do not carry over jewelry-specific content or copy.
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
  preserve proportions.
- Derived brand colors (sampled directly from the asset pixels, not guessed):
  navy `#11253C`, cream `#F7F1E5`, gold `#CDAF80`. See `docs/DESIGN-SYSTEM.md`. Don't overuse gold
  or navy — the interface should read as clean and commerce-focused, not jewelry/luxury pastiche.

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

Phases 1 (Foundation) and 2 (Product data model) are done — see `docs/PRODUCT-ROADMAP.md` and
`docs/PRODUCT-DATA.md`. Do not build the homepage sections, product/category pages, cart,
checkout, auth, or admin dashboard until asked. Do not connect MongoDB (schemas exist but aren't
wired up) or create fake products/reviews/prices. Confirm scope with the user before starting a
new phase.
