# Design System

Status: **Phase 3 — Global storefront design system implemented; Phase 3 correction applied;
Phase 3 redesign applied (homepage built); Phase 4 — homepage refinement applied (§9); Phase 5 —
shop/category listing applied (§10).** The original Phase 1 visual reference (a jewelry
site) was replaced by the user with a new authoritative reference
(`resources/reference-theme.png`/`.pdf`, a "TimTom"-style e-commerce homepage). Two passes
followed: a **correction** pass (palette only — see §3) and a **redesign** pass, where the user
explicitly rejected "inspired by" as insufficient and required
`resources/reference-theme.png`/`.pdf` to be treated as the literal **layout blueprint** —
proportions, header/nav structure, hero, grid density, card anatomy, and footer structure
reproduced closely, not just the color palette. That redesign pass also built the real homepage
(`src/app/page.tsx`), previously deferred to Phase 4 — see `docs/PRODUCT-ROADMAP.md` for how that
interacts with the phase order. See `docs/ARCHITECTURE.md` for where these components live in the
folder structure.

## 1. Brand assets (`assets/`)

10 files, each in light/dark pairs: `logo`, `appicon`, `favicon`, `banner`, `profile`.

**Logomark:** a monogram built from "R" and "V" sharing a stroke, rendered in a warm gold, paired
with the wordmark "Renvura" in a bold, geometric sans-serif. The banner variants add the tagline
"AUTHORITY · REFINED" in a small letter-spaced caption below the wordmark — the clearest signal of
brand tone available: confident, understated, not shouty or discount-driven.

**Colors sampled directly from the asset pixels** (not estimated):

| Token | Hex | Where it comes from |
|---|---|---|
| `brand-navy` | `#11253C` | Dark backgrounds (`logo-dark`, `banner-dark`, `appicon-dark`), and the wordmark color on light backgrounds |
| `brand-cream` | `#F7F1E5` | Light backgrounds (`logo-light`, `banner-light`, `appicon-light`) |
| `brand-gold` | `#CDAF80` | The "RV" monogram in both variants — the one constant accent color |

No other brand colors can be confirmed from the assets — everything else in this document is a
proposed direction, not something read off the files.

**Usage rules (non-negotiable, carried from the client brief):**
- Never redesign, regenerate, or replace the logo with text/emoji.
- Pick the variant (light/dark) by the background it sits on, not by page theme alone — e.g. the
  dark logo goes on light surfaces, the light logo goes on dark/navy surfaces.
- Never stretch or distort; preserve the aspect ratio.
- Gold is an **accent**, used sparingly (CTAs, small marks, hover states) — not a fill color. Navy
  is for text/dark-surface use, not the default page background. The brief is explicit that the
  interface should stay commerce-focused and clean rather than leaning into gold/navy "luxury"
  styling just because the logo has it.

**Phase 3 correction:** as of the approved storefront palette (§3), navy/cream/gold are demoted
further — they're **secondary brand accents only**, not the primary interactive/surface palette.
The logo lockups (baked-in PNGs, unchanged) are the main place they still appear; elsewhere each
gets exactly one restrained touch (e.g. the footer divider dot, the announcement bar's truck icon)
rather than driving buttons, links, or section backgrounds the way they did before this
correction.

## 2. Layout reference (`resources/reference-theme.png` / `.pdf`)

**Phase 3 correction:** this reference was intentionally replaced by the user; it no longer shows
the original jewelry/"LUSION" site described in earlier drafts of this document. The current,
authoritative reference is a "TimTom"-style e-commerce homepage (a Bangladeshi baby/kids
clothing-and-toys shop at time of capture). None of its kids-brand content, copy, illustration
style, or purple/indigo-as-childish framing carries over; what carries over is the *structural
pattern* and the *approved storefront palette* (§3), which is a deliberate departure from that
site's look toward a cleaner, commerce-focused indigo/slate system.

**Phase 3 redesign:** these two files are the literal **layout blueprint**, not just a mood
reference — proportions, section order, header/nav structure, hero sizing, grid density, card
anatomy, and footer structure are reproduced closely enough that the built storefront and the
reference read as the same design-system family side by side. Section 4 documents exactly how each
piece maps to a component below.

Observed structural pattern, top to bottom:
1. Slim utility bar (contact/WhatsApp number, order tracking, locale switcher) in the primary
   accent color, directly above a white sticky header with logo, a "Browse All Categories"
   dropdown trigger, primary nav, search field, and cart/wishlist/account icons.
2. Full-bleed hero banner: large illustrated/lifestyle graphic, a short headline + subhead, no
   competing CTA clutter — kept simple and image-led.
3. "Popular Products" section: a category filter tab row, then a dense grid (4–5 columns desktop)
   of product cards. Each card shows image, category label, title, price with struck-through
   original price and a discount-percentage tag shown directly on the price line (not just as an
   image overlay), and an **inline "Add to Cart" button on the card itself** — the CTA is part of
   the grid, not a separate step.
4. "Daily Best Sells": a horizontally-scrollable carousel mixing one promotional banner tile with
   several product tiles, "Only X left" urgency tags where genuinely applicable, and an
   out-of-stock state shown as a disabled button rather than removing the card.
5. A brand-story block: small "Our Story" eyebrow, a short headline, 2–3 short paragraphs, and a
   supporting graphic/device mockup — a single pacing break between the product grid and the
   footer, not repeated multiple times.
6. Footer is dense, dark-background, organized into clear columns (Shop / Information / Get in
   touch), a newsletter signup row, and payment-method icons — directly relevant to Bangladesh
   (bKash/Nagad-style trust marks belong here, as already implemented).

**What to adapt for Renvura (electronics + health & beauty, Bangladesh, conversion-focused):**
- Keep: the utility-bar contact/trust signal above the header (maps directly to a BD
  phone/WhatsApp-ordering expectation), the dense product grid with inline price + discount tag +
  Add to Cart (reduces clicks to purchase, which matters more for gadget/beauty impulse buys than
  for jewelry), the best-sellers carousel pattern, and the dark, column-organized footer.
- Change: swap the kids-brand illustrated hero and cutesy copy ("Your Kid Loves Us!") for
  problem-solving/utility framing appropriate to electronics/health & beauty (the brief calls out
  a "Problem-Solving Gadgets" section); swap the reference's purple/indigo-as-childish-brand-color
  usage for the approved storefront palette's more restrained, commerce-focused application (§3);
  keep Renvura navy/cream/gold as secondary accents (logo, small touches) rather than adopting the
  reference's own branding. Trust and delivery information (COD, Dhaka vs. outside-Dhaka,
  warranty) should carry more visual weight in the utility bar/header than the reference gives
  its own contact info, since that's a bigger purchase-decision factor for BD gadget/beauty
  shoppers.

## 3. Design tokens (implemented — `src/app/globals.css`)

HeroUI v3 themes entirely through CSS custom properties (see
`node_modules/@heroui/styles/dist/themes/default/variables.css`). Rather than fighting that or
wrapping every HeroUI component, `globals.css` overrides the semantic tokens HeroUI itself reads —
every HeroUI component (Button, Chip, SearchField, Drawer, focus rings, …) is rethemed for free.

**Color tokens (Phase 3 correction — approved storefront palette, supersedes the original
navy-led scheme):**

| Token | Light value | Dark value | Used for |
|---|---|---|---|
| `--background` | `#FFFFFF` | `--storefront-ink` (`#101727`) | Page background |
| `--foreground` | `#111827` | `#F8FAFC` | Page text |
| `--accent` / `--accent-foreground` | `#5046E5` / `#FFFFFF` | same | Primary buttons, links, focus rings |
| `--accent-hover` | `#4338CA` | same | Button/link hover-active state |
| `--background-secondary` | `#F8FAFC` | `--storefront-ink-secondary` (`#1C2333`) | Card image wells, hover surfaces, dev-preview panels |
| `--border` | `#E5E7EB` | cream-tinted 16% hairline | Card/input borders |
| `--warning` | `#F59E0B` | same | Overridden from HeroUI's default amber to the exact approved hex — used for `SaleBadge` (discount chips), not just literal warning states |
| `--storefront-ink` / `--storefront-ink-secondary` | `#101727` / `#1C2333` | (same, primitives don't change) | Dark surfaces: Footer, AnnouncementBar (`bg-ink`/`bg-ink-secondary` utilities), dark-mode page background |
| `--brand-navy` / `--brand-cream` / `--brand-gold` | `#11253C` / `#F7F1E5` / `#CDAF80` | (same, primitives don't change) | **Secondary accents only** — logo lockups, plus exactly one restrained touch each (footer divider dot, announcement bar truck icon) |
| `--secondary-text` | `#4A5A6E` | (same) | Brand-tinted muted text, used narrowly in `BrandStory`'s body copy only — everywhere else the opacity-based `text-foreground/70` convention is the muted-text mechanism (see CLAUDE.md's contrast rule) |

Unlike the original scheme, the accent does **not** swap between light and dark mode: indigo
(`#5046E5`) has enough contrast against both the white light-mode background and the new
`--storefront-ink` dark-mode background, so there's no navy-on-navy-style invisibility problem to
work around. `SaleBadge` uses `color="warning"` (amber) rather than `color="danger"` (red) so
discount tags read as promotional rather than as an error/danger state — matching the reference's
orange discount tags.

**Typography scale** (`--text-display/h1/h2/h3/body/small/price/label`): fluid `clamp()` sizes so
components don't need per-breakpoint text overrides. One font family throughout (Geist Sans, via
`next/font/google`, wired in `src/app/layout.tsx`) — the "open decision" from Phase 1 (whether to
add a display serif) is resolved as **no**: a second family added complexity without a concrete
need, and Geist's geometric character already echoes the wordmark's geometric sans. Revisit only
if a specific hero moment genuinely needs it.

| Class | Approx. size (mobile → desktop) | Use |
|---|---|---|
| `text-display` | 36px → 56px | Largest hero-style moments (none built yet — Phase 4) |
| `text-h1` | 30px → 44px | Page-level heading |
| `text-h2` | 24px → 32px | Section heading |
| `text-h3` | 20px → 24px | Card/subsection heading |
| `text-body` | 16px | Default paragraph copy |
| `text-small` | 14px | Meta info, captions, nav links |
| `text-price` | 18px → 22px, semibold, tabular-nums | Selling price emphasis |
| `text-label` | 12px, uppercase, wide tracking | Eyebrows, category labels, badges |

**Shadow**: one `shadow-card` token (soft, foreground-tinted, low-opacity) for product cards and
similar raised surfaces — not a generic Tailwind `shadow-lg`, which reads flatter/greyer against
the palette. Retinted from navy to the `#111827` foreground gray in the Phase 3 correction.

**Container & section rhythm**: no CSS tokens for these — `src/components/layout/Container.tsx`
(`max-w-7xl`, responsive `px-4/6/8` gutters) and `Section.tsx` (`py-10 sm:py-14 lg:py-20`) are the
single source of truth instead, so "container width" and "section spacing" are one component
decision each, not a value repeated per page.

## 4. Component rules (implemented)

**Logo usage**: the brand PNGs are opaque lockups (a navy or cream rectangle is baked into the
file, not a transparent cutout — confirmed by sampling alpha=255 at the background pixels in
Phase 1). That makes the "pick the variant by the background it sits on" rule literal, not just
aesthetic:
- Header (white/light background) → `logo-light.png` (cream lockup, blends acceptably against a
  near-white header).
- Footer (dark background, by design — see below) → `logo-dark.png` (navy lockup). **Known minor
  nuance from the Phase 3 correction**: the footer background is now `--storefront-ink`
  (`#101727`), not the exact `brand-navy` (`#11253C`) the logo PNG's background rectangle is baked
  to — both are dark near-black tones so the mismatch reads as very subtle at normal viewing
  distance, but it's no longer a bit-for-bit-exact blend the way it was pre-correction. Not worth
  a workaround unless it's visibly distracting in practice; flagged here rather than silently
  accepted.

**Header** (`src/components/layout/Header.tsx`): sticky, translucent+blurred white background,
hairline bottom border. **Phase 3 redesign**: the desktop `<nav>` moved out of `Header` entirely
(into `SecondaryNav`, below); the search field is now the dominant center element
(`flex-1 max-w-2xl`, was `md:max-w-xs`), matching the reference's visually-dominant search. Cart
and Account gained visible text labels next to the icon on desktop (`IconLinkButton` now supports
icon+label, not just icon-only) — Wishlist stays icon-only, matching the reference's own header.
Mobile: hamburger + search-trigger icon that both open one shared mobile drawer (see Mobile
behavior below); cart stays visible at every size.

**SecondaryNav** (`src/components/layout/SecondaryNav.tsx`, new in the Phase 3 redesign): the
compact bordered row beneath the header — reference layout: a purple "Browse All Categories"
dropdown (HeroUI `Dropdown`, listing `getAllCategories()` — a real, working menu, not decorative)
on the left, primary nav (`NavLinks`, reused) on the right. Desktop-only (`hidden lg:block`) —
mobile nav still lives entirely in the existing `MobileNav` drawer, unchanged.

**Footer** (`Footer.tsx`): the one section besides the announcement bar that's deliberately
dark — footers conventionally read as "grounding" the page, and it's the correct home for the dark
logo lockup. Background is `bg-ink` (`--storefront-ink`, `#101727`); column headings/body text are
plain white. Gold is kept to exactly one restrained touch — the divider dot in the copyright row.
**Phase 3 redesign structure** (matches the reference's column set): Brand (logo, description,
social icons — each icon gated by `isConfigured(brand.social.x)`, so nothing renders until real
URLs exist) / Shop (All Products, Categories, New Arrivals — the latter two currently point at the
same `/shop` scaffold; Phase 5 hasn't built a dedicated categories index or new-arrivals view yet)
/ Information (Contact Us, About Us, FAQ, Privacy Policy) / Get in touch (real configured
phone/email only — falls back to a plain "Contact Us" link when none are configured, which is the
current state). Below the column grid: a newsletter row (`NewsletterSignup.tsx` — same
"foundation only, form present, `preventDefault`, no fake success state" pattern as `SearchBar`),
then the payment-methods row (unchanged: plain text, explicit manual-processing note, never implies
a gateway integration that doesn't exist), then copyright.

**AnnouncementBar** (`AnnouncementBar.tsx`): **Phase 3 redesign**: rebuilt as the reference's
3-zone utility strip — `bg-accent` (purple, not the dark ink surface), white text. Left: About
Us/Contact Us. Right: a "Call/WhatsApp to Order Now" link that only renders once
`brand.contact.phone`/`whatsapp` is configured (currently TODO, so it's correctly absent — not a
dead link to nowhere), Order Tracking, and a static "৳ BDT" currency label. Mobile collapses to a
single centered COD trust line. No more `message` prop — the bar is now a fixed structural row, not
a single editable string.

**ProductCard** (`src/components/ecommerce/ProductCard.tsx`): only renders fields the `Product`
actually has. Deliberate omissions: no ratings/review counts (no such data exists), no
"Best Seller"/"Trending" badges (nothing in the data model supports them yet — see
`src/components/ecommerce/Badges.tsx`, which only implements "In Stock" / "Out of Stock" / a
computed "Sale −X%" in amber, `color="warning"`, matching the reference's orange discount tags
rather than reading as an error state). **Phase 3 redesign**: the card anatomy now matches the
reference's exactly — image, category label, 2-line title, price row, and a **single full-width
"Add to Cart" button** (the "Buy Now" second button and the wishlist heart overlay from the
original Phase 3 build were both removed — neither appears in the reference's card, and the
redesign brief was explicit about card anatomy). Padding tightened for a denser card
(`p-3`/`gap-1.5`, was `p-4`/`gap-2`) matching the reference's compact grid. Add to Cart is disabled
(not hidden) whenever `pricing.sellingPrice` is `null` or the item is out of stock — real business
logic, and it'll naturally start working once Phase 7/8 wire up real cart/checkout and products get
real prices. **Important known gap**: every current product has `sellingPrice: null`, so every
real card today shows "Price unavailable" and a disabled button — the reference shows populated
prices/discount tags on every card; Renvura's cards won't visually match that part until Phase 2's
pricing gap is resolved. This is expected, not a bug — see docs/PRODUCT-ROADMAP.md.

**Price** (`Price.tsx`): uses the Phase 2 `formatBDT`/`calculateDiscountPercentage` utilities
directly. Renders "Price unavailable" — never `wholesalePrice` — when `sellingPrice` is `null`;
`wholesalePrice` is Renvura's cost, not a customer price, and showing it would be exactly the kind
of fabricated-looking data this project avoids. Since no product has a `sellingPrice` yet (Phase 2
status), every real `ProductCard` on `/ui-preview` currently and correctly shows "Price
unavailable" — that's expected, not a bug.

## 5. Mobile behavior (implemented)

`src/components/layout/MobileNav.tsx` is one module (not scattered files) because the hamburger
button, the search-trigger button, and the drawer all need to share one open/close state — done
via a small context + HeroUI's `useOverlayState()`, exposed as `MobileNavProvider` /
`MobileMenuTrigger` / `MobileSearchTrigger` / `MobileDrawer`. The drawer itself is HeroUI's
`Drawer` (react-aria `Modal`/`Dialog` underneath), which gives focus trapping, Escape-to-close,
and focus return for free — not reimplemented by hand. It contains, in order: logo + close button,
the same `SearchBar` used on desktop, vertical `NavLinks`, and wishlist/account/cart icons in the
footer — so mobile users reach every primary action from one place.

**Inert nav items**: `NavLinks.tsx` can render a `href: null` item as an inert, non-interactive
`<span>` with a small "Soon" pill instead of a dead/fake link (WCAG 1.4.3 exempts inactive-component
text from the normal contrast minimum, so the de-emphasized look there is intentional) — the
mechanism is generic and stays in the component even though no current nav item uses it.
**Phase 3 redesign**: `mainNavItems` (`src/config/navigation.ts`) was reordered/relabeled to match
the reference's nav row exactly — `Home, Products (was "Shop"), Electronics & Gadgets, Health &
Beauty` — which dropped the "Offers" placeholder item from the config; it can come back the same
way once there's a real destination for it.

**Category nav links** (Electronics & Gadgets, Health & Beauty, Products) *do* point to real
intended paths (`/electronics-gadgets`, `/health-beauty`, `/shop`) even though those pages don't
exist until Phase 5 — that's normal, expected nav scaffolding, not a bug; Next.js doesn't require
`<Link>` targets to resolve at build time. `NavLinks` now renders in two places: `SecondaryNav`
(desktop, horizontal) and the mobile drawer (vertical) — same component, same config, per the
original one-source-of-truth rationale.

## 6. Accessibility notes specific to this phase

- Every icon-only button has a real `aria-label` (and product-specific ones on `ProductCard`'s
  wishlist/cart/buy buttons, since a page with many cards would otherwise have many identically
  "Add to Cart"-labeled controls).
- Muted/secondary text uses a minimum of 70% foreground opacity (verified ≈5.8:1 on white,
  ≈7.4:1 for cream-on-navy) — several earlier draft values (40–60%) were checked against WCAG AA
  and replaced; see git history on this file's components if tuning colors further.
- Icon-link tap targets are 44×44px (`IconLinkButton`), not the smaller 40px default, for mobile
  ergonomics.
- The product image inside `ProductCard` is a second, `aria-hidden`/`tabIndex={-1}` link to the
  same destination as the title — avoids two identical tab stops per card while keeping the image
  clickable for pointer users.

## 7. Temporary route: `/ui-preview`

`src/app/ui-preview/page.tsx` exists **only** to visually verify this design system in isolation
(typography, buttons, badges, Price states, real `ProductCard`s from Phase 2 data, container/
section rhythm) — useful independently of the now-built homepage (§9) for checking individual
tokens/components without the full page composition. It's marked `robots: { index: false, follow:
false }` and carries an on-page notice. **Remove or gate this route before production
deployment** — it is not, and must never become, part of the public site.

## 8. UI principles carried forward

- Server Components by default — Client Components are each for a concrete, stated reason:
  `SearchBar`/`NewsletterSignup` (real form + `preventDefault`, no backend yet), `MobileNav`
  (shared overlay state), `NavLinks` (`usePathname`), `providers` (theme context),
  `CategoryTabs`/`FeaturedProductsRow` (HeroUI `Tabs` state / scroll-ref interactivity — see §9).
- HeroUI v3 primitives (Button, Chip, SearchField, Drawer, Dropdown, Tabs, TextField/Input) retheme
  via CSS tokens, not forks — customize via `className`/props, never copy-paste HeroUI internals.
- Conversion-focused means clear price, clear CTA, clear delivery/COD trust signals near the
  point of decision — not just "looks premium."
- Accessible by default: rely on HeroUI/React Aria's primitives, don't strip them out for a
  custom look.

## 9. Homepage (`src/app/page.tsx`, Phase 4)

Initial build was pulled ahead of the normal phase order into the Phase 3 redesign pass; the
section set below reflects the **Phase 4 refinement pass** (see `docs/PRODUCT-ROADMAP.md`) that
added the two sections that were missing and audited everything else. Server Component; fetches
`getAllProducts()`/`getAllCategories()` once and passes the results down — no client-side
fetching. Exports page-level `metadata` (`title: { absolute: "Renvura — Gadgets, Electronics &
Health and Beauty in Bangladesh" }`, using `absolute` so it bypasses the root layout's
`"%s | Renvura"` template) — homepage-specific, truthful, no keyword stuffing; full per-product SEO
(canonical URLs, JSON-LD, etc.) is still Phase 12.

Section order: `HeroBanner` → Popular Products (`CategoryTabs`, which renders its own title +
category-tab row + filtered `ProductGrid`, since HeroUI's `Tabs.Root` has to wrap both) → centered
"View All Products" link (→ `/shop`) → `FeaturedProductsRow` ("Featured Picks" — see below for why
not "Best Sellers") → `CategoryHighlights` → `WhyShopWithRenvura` → `BrandStory` ("Our Story").
Section backgrounds alternate between the plain body background and `bg-background-secondary` for
gentle separation — no dark backgrounds anywhere except the footer (see §3).

New composite components live in `src/components/home/` (distinct from the generic reusable
`ecommerce/` primitives and `layout/` chrome, since these are homepage-composition-specific, not
meant for reuse across arbitrary pages):

- **`HeroBanner.tsx`**: a single image-led banner using the approved campaign artwork
  (`resources/hero.png`, copied to `public/images/home/hero.png` — the original is never modified).
  The artwork already contains the full composition (branding, headline, copy, CTA, product
  photography), so nothing is rendered on top of it — that would duplicate the same content in the
  DOM/for screen readers. The whole banner is one link to `/shop` (`aria-label="Shop Renvura
  products"`). The container's aspect ratio is set via an **inline style** (`aspectRatio: "3 / 1"`),
  not only the matching Tailwind class — `next/image`'s `fill` mode makes the image
  `position: absolute` (out of normal flow), so if the CSS class ever failed to compile (this
  happened once, from a Turbopack dev-cache staleness bug — the class silently never made it into
  the dev bundle even though `npm run build` compiled it correctly) the container would collapse to
  zero height and the hero would disappear; the inline style can't be dropped by a CSS pipeline
  issue since React applies it directly to the element.
- **`CategoryTabs.tsx`**: All / Electronics & Gadgets / Health & Beauty tabs (HeroUI `Tabs`,
  keyboard-accessible via react-aria out of the box), filtering an in-memory product array — no new
  data fetching, no route change per tab, no global state.
- **`ProductGrid.tsx`**: the shared dense responsive grid
  (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`, ~5 columns at reference/1440px
  width) wrapping `ProductCard`s.
- **`FeaturedProductsRow.tsx`**: horizontally-scrollable strip with prev/next controls (native
  `<button>`s with `aria-label`s, a plain `ref.scrollBy` — not a new dependency), starting with a
  promotional category tile (real category, `bg-surface-warm`, e.g. "Health & Beauty Picks" →
  `/health-beauty`) followed by product cards. Titled **"Featured Picks"**, not "Best Sellers"/
  "Daily Best Sells" — no sales-ranking data exists in the Phase 2 catalog to support a
  best-seller claim.
- **`CategoryHighlights.tsx`** (Phase 4): a 2-column editorial block (1-column on mobile), one
  card per top-level category — real product photography (`x699-turbo-fan` for Electronics &
  Gadgets, `dark-spot-correcting-glow-serum` for Health & Beauty; chosen to avoid repeating
  `BrandStory`'s images), one hand-authored truthful sentence per category (generic — "what's
  actually in the catalog," never invented counts/claims; lives in the component, not in
  `src/data/categories.ts`, since it's homepage marketing copy, not product data), and a CTA
  ("Shop Electronics" / "Shop Health & Beauty") to the real category route.
- **`WhyShopWithRenvura.tsx`** (Phase 4): a compact 4-item trust grid — Cash on Delivery,
  Nationwide Delivery, Selected Products, Secure Ordering Experience — each a short, currently-true
  statement. Deliberately **excludes** "free delivery," "same-day delivery," "guaranteed warranty,"
  and "verified reviews," since no policy backs any of those yet. Three new hand-authored SVG icons
  (`IconCash`, `IconShieldCheck`, `IconTag`) were added to `src/components/ui/icons.tsx` in the
  existing stroke style — no new icon-library dependency; `IconTruck` (already existed) is reused
  for delivery.
- **`BrandStory.tsx`**: a 2×2 collage of real product photos (not a fabricated lifestyle scene) on
  a `bg-surface-warm` panel, beside an "Our Story" eyebrow, heading, gold underline accent, and
  three short paragraphs using `--secondary-text` for body copy (§3) — deliberately modest, no
  invented history, customer counts, or market-leadership claims. As of Phase 4, the copy also
  avoids internal business/sourcing details (supplier fulfillment, wholesale pricing, dropshipping)
  that don't belong on a customer-facing page.

`/ui-preview` is unchanged and still useful for isolated component/token verification; the
homepage does not link to it.

## 10. Shop & category listing (`/shop`, `/electronics-gadgets`, `/health-beauty`, Phase 5)

Three routes share one listing architecture rather than duplicating it per page:
`src/services/products.ts`'s `getProductListing()` does category filtering, search, sorting, and
pagination (business logic, kept out of components); `src/components/shop/ProductListingPage.tsx`
is the one Server Component all three `page.tsx` files render, parameterized by an optional
`categorySlug` (present for the two category routes, absent for `/shop`). All listing state lives
in the URL (`?category=`, `?sort=`, `?q=`, `?availability=`, `?page=`) — shareable links, no global
client state.

**Data-driven filter/sort activation**: price sort and the "in stock only" toggle are real,
working code paths that only appear in the UI once the current result set has real variance to
act on — see `docs/PRODUCT-ROADMAP.md` Phase 5 for why (every product currently has
`sellingPrice: null` and `inventory.status: "in_stock"`). Neither ever reads
`pricing.wholesalePrice`. With today's data, the only controls that render are category pills
(`/shop` only) and Featured/Name A–Z/Name Z–A sort.

**Components** (`src/components/shop/`, plus one moved primitive):
- **`ProductListingPage.tsx`**: breadcrumb (`Breadcrumbs`, `src/components/ui/`), `h1` title +
  one-sentence description + real product count ("21 products"), a filter row (category pills +
  `SortSelect`, composed once and shown both inline on desktop (`hidden md:flex`) and inside
  `MobileFilterDrawer` on mobile (`md:hidden`) — not duplicated markup), the product grid, and
  numbered pagination (plain server-rendered `<Link>`s, page size 12 — with 21 products total,
  `/shop` is the only route that currently shows more than one page). Category filtering, search,
  sort, and pagination are computed server-side from the awaited `searchParams`.
- **`SortSelect.tsx`** (Client Component): the one control that needs `router.push` — a native
  `<select>` has no href to navigate to on its own change event.
- **`MobileFilterDrawer.tsx`** (Client Component): same HeroUI `Drawer` composed-API pattern as
  `layout/MobileNav.tsx` (focus trapping, Escape-to-close, focus return come from react-aria, not
  reimplemented).
- **`src/components/ui/Breadcrumbs.tsx`**: generic `nav[aria-label="Breadcrumb"]`, reusable beyond
  the shop routes; the current page is `aria-current="page"`, not a link.
- **`ProductGrid.tsx`** moved from `src/components/home/` to `src/components/ecommerce/` — it was
  never actually homepage-specific, and Phase 5 needed the same grid, so it now lives with the
  other generic reusable primitives (`ProductCard`, `Price`, `Badges`).

**Empty state**: "No products found for the selected filters." + a "Clear filters" link (the base
route with no query params) + a "Back to Shop" link (only on the two category routes, where it
isn't redundant with the page itself).

**Search**: `SearchBar.tsx` (Header, both desktop and the mobile drawer) now navigates to
`/shop?q=<term>` on submit instead of only calling `preventDefault()`. It's prefilled from
`useSearchParams()` when already on `/shop?q=...`, which requires wrapping the hook usage in
`<Suspense>` (`SearchBar` is rendered on every route via `StoreShell`, including statically
prerendered ones like `/_not-found` — without the boundary, `next build` fails). The actual search
(`getProductListing`'s `q` handling) matches product title, model, and category name —
case-insensitive substring, no new dependency, no autocomplete.

**SEO**: each route sets a truthful title/description; `alternates.canonical` (pointing at the
clean, query-free path) and the root layout's `metadataBase` are both gated behind
`isConfigured(brand.urls.site)` — that's still a `TODO` placeholder, so canonical URLs are wired
but inactive until a real production domain is configured, the same pattern used for every other
unconfigured `brand.*` field in this project.
