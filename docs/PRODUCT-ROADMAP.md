# Product Roadmap

This roadmap defines the intended build order. **Phases 1 and 2 are complete.** Do not start a
later phase without explicit confirmation — each phase should be scoped and agreed before work
begins.

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

## Phase 3 — Global layout
Header/navigation, footer, mobile nav, theme handling, global providers, base layout shell that
homepage and category/product pages will share.

## Phase 4 — Homepage
Hero, Featured Products, Best Sellers, Shop by Category, Trending Products, Problem-Solving
Gadgets, Promotional Banner, Health & Beauty Feature, New Arrivals, Why Shop With Renvura,
Customer Reviews, Newsletter — built against real product data from Phase 2, not placeholders.

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
