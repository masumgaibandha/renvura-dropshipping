# Product Roadmap

This roadmap defines the intended build order. **Phases 1–3 are complete.** Do not start a later
phase without explicit confirmation — each phase should be scoped and agreed before work begins.

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

## Phase 3 — Global storefront design system ✅
Design tokens (colors, typography, shadows, container/section rhythm) in `src/app/globals.css`,
rethemeing HeroUI v3 via its CSS custom-property system. Built and wired into every route via
`StoreShell`: `AnnouncementBar`, sticky `Header` with desktop nav + inline search, `MobileNav`
drawer (hamburger + search trigger sharing one overlay state), `Footer`. Built the reusable
storefront primitives Phase 4+ will consume: `ProductCard`, `Price`, `Badges`
(In Stock/Out of Stock/Sale — no fabricated "Best Seller"/"Trending" states), `SearchBar` (UI only,
no search logic yet). Added a temporary `/ui-preview` route (noindex, on-page notice) to verify
all of this against real Phase 2 product data — see `docs/DESIGN-SYSTEM.md` for full rules and
`docs/PRODUCT-ROADMAP.md` note below.

**Not done in Phase 3** (deferred, per explicit scope): no real search, cart, checkout, auth,
admin, or MongoDB connection. Add to Cart / Buy Now are wired to real state (disabled when
unpriced/out of stock) but don't add anything anywhere yet. `/ui-preview` must be removed or
gated before production launch.

## Phase 4 — Homepage
Hero, Featured Products, Best Sellers, Shop by Category, Trending Products, Problem-Solving
Gadgets, Promotional Banner, Health & Beauty Feature, New Arrivals, Why Shop With Renvura,
Customer Reviews, Newsletter — built against real product data from Phase 2 using the Phase 3
`ProductCard`/`Price`/`Section`/`Container` primitives, not placeholders or new one-off styling.

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
