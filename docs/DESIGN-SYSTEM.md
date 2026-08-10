# Design System

Status: **Phase 3 — Global storefront design system implemented.** Sections 1–2 below are the
original Phase 1 visual-research conclusions (kept as historical record — still accurate).
Sections 3 onward now describe what's actually built, not just planned. See
`docs/ARCHITECTURE.md` for where these components live in the folder structure.

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

## 2. Layout reference (`resources/reference-theme.png`)

A jewelry e-commerce homepage (brand "LUSION", Valentine's-themed at time of capture). This is a
**layout and pacing reference only** — none of its content, copy, or jewelry-specific imagery
carries over.

Observed structural pattern, top to bottom:
1. Slim utility bar + primary nav, generous horizontal padding, minimal chrome.
2. Full-bleed hero with large lifestyle photography, a short eyebrow label, a large serif/display
   headline, one primary CTA — lots of surrounding whitespace, text left-aligned over a soft
   pastel background rather than directly on the photo.
3. A short, centered editorial/brand-statement block (quote-like, small type, lots of vertical
   breathing room) used as a pacing break between commercial sections.
4. Product sections follow a consistent rhythm: a small section label (often with an icon), then
   a 3–4 column product grid with generous gutters, consistent card proportions, price shown
   simply below the product image.
5. Full-bleed promotional banners (image + solid-color text panel, or duotone photo with overlaid
   headline) are interleaved between product grids roughly every 2–3 sections, not stacked
   back-to-back — this is what keeps a long homepage from feeling monotonous.
6. Large duo-image editorial blocks (two large photos side by side, minimal text) are used for
   category storytelling ("Men's Jewelry" / "Women's Jewelry" in the reference) — this maps well
   to Renvura's two initial categories.
7. Footer is dense but organized into clear columns, with payment-method icons — directly
   relevant to Bangladesh (bKash/Nagad-style trust marks will belong here later).

**What to adapt for Renvura (electronics + health & beauty, Bangladesh, conversion-focused):**
- Keep: generous whitespace, large hero imagery, editorial pacing breaks between grids, simple
  price-under-image product cards, duo-image category storytelling for the two initial
  categories.
- Change: swap the soft pastel/blush palette for the neutral cream/navy/gold direction above;
  swap romantic/gift-occasion framing for problem-solving/utility framing (the brief calls out a
  "Problem-Solving Gadgets" section); swap jewelry macro photography for clean product-on-white or
  lifestyle-in-use photography; trust and delivery information (COD, Dhaka vs. outside-Dhaka,
  warranty) need more visual weight than a jewelry site typically gives them, since that's a
  bigger purchase-decision factor for BD gadget/beauty shoppers than for jewelry.

## 3. Design tokens (implemented — `src/app/globals.css`)

HeroUI v3 themes entirely through CSS custom properties (see
`node_modules/@heroui/styles/dist/themes/default/variables.css`). Rather than fighting that or
wrapping every HeroUI component, `globals.css` overrides the semantic tokens HeroUI itself reads —
every HeroUI component (Button, Chip, SearchField, Drawer, focus rings, …) is rethemed for free.

**Color tokens:**

| Token | Light value | Dark value | Used for |
|---|---|---|---|
| `--background` / `--foreground` | white / `brand-navy` | `brand-navy` / `brand-cream` | Page background/text |
| `--accent` / `--accent-foreground` | `brand-navy` / `brand-cream` | `brand-gold` / `brand-navy` | Primary buttons, links, focus rings — see note below |
| `--border` | navy-tinted 12% hairline | cream-tinted 16% hairline | Card/input borders |
| `--brand-navy` / `--brand-cream` / `--brand-gold` | `#11253C` / `#F7F1E5` / `#CDAF80` | (same, primitives don't change) | Brand-locked surfaces (announcement bar, footer) |

Dark mode swaps the accent from navy to gold: a navy button would be invisible on a navy
background, and gold-on-navy is already the exact treatment used in `assets/appicon-dark.png` and
`assets/logo-dark.png`, so it's a brand-faithful fix rather than an arbitrary one. Gold is still
only ever the *accent* in dark mode — never a fill color — so "don't overuse gold" holds in both
themes.

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

**Shadow**: one `shadow-card` token (soft, navy-tinted, low-opacity) for product cards and similar
raised surfaces — not a generic Tailwind `shadow-lg`, which reads flatter/greyer against the warm
cream/navy palette.

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
- Footer (navy background, by design — see below) → `logo-dark.png` (navy lockup, blends exactly).

**Header** (`src/components/layout/Header.tsx`): sticky, translucent+blurred white background,
navy-tinted hairline bottom border. Desktop (`lg:` / 1024px+): full nav row + inline search.
Below that: hamburger + search-trigger icon that both open one shared mobile drawer (see Mobile
behavior below). Wishlist/account icons hide below `md:` (768px) to keep the mobile bar from
crowding; cart stays visible at every size since users expect to reach it from anywhere.

**Footer** (`Footer.tsx`): the one section besides the announcement bar that's deliberately
navy/dark — footers conventionally read as "grounding" the page, it's the correct home for the
dark logo lockup, and it gives gold a legitimate, restrained place to appear (column headings,
divider dot) without touching the main light storefront. Structure: Brand / Shop / Customer
Service / Information / Payment, per the brief. Payment methods are listed as plain text (no
bKash/Nagad/Rocket logo assets exist, and none should be implied to be official brand marks) with
an explicit note that mobile-wallet payments are processed manually — never implies API/gateway
integration that doesn't exist. Nothing reads from `brand.contact`/`brand.social` (still
placeholder "TODO: ..." values) — the footer links to `/contact` etc. instead of inlining an email
or phone number, so there's nothing to leak once those routes exist.

**AnnouncementBar** (`AnnouncementBar.tsx`): navy background, cream text, a small gold truck icon
— the same gold-on-navy pairing as the footer, in miniature. Content is a `message` prop
(default: "Cash on Delivery Available Nationwide") — never a hardcoded promotion/discount claim.

**ProductCard** (`src/components/ecommerce/ProductCard.tsx`): only renders fields the `Product`
actually has. Deliberate omissions: no ratings/review counts (no such data exists), no
"Best Seller"/"Trending" badges (nothing in the data model supports them yet — see
`src/components/ecommerce/Badges.tsx`, which only implements "In Stock" / "Out of Stock" / a
computed "Sale −X%"). The card shows the **Out of Stock** badge as an exception overlay; "in
stock" is the unflagged default rather than a badge on every card, to keep cards from feeling
noisy. Add to Cart / Buy Now are disabled (not hidden) whenever `pricing.sellingPrice` is `null`
or the item is out of stock — real business logic (you can't buy something with no price), not a
throwaway placeholder, and it'll naturally start working once Phase 7/8 wire up real cart/checkout
and products get real prices.

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

**"Offers" nav item**: has no real destination yet (no promo-page content to show, and none should
be invented), so `src/config/navigation.ts` marks it `href: null` and `NavLinks.tsx` renders it as
an inert, non-interactive `<span>` with a small "Soon" pill instead of a dead/fake link. This is
the one place in the UI that intentionally uses low-contrast text below the normal minimum — WCAG
1.4.3 explicitly exempts text that's part of an inactive UI component, and looking clearly
de-emphasized is the point.

**Category nav links** (Electronics & Gadgets, Health & Beauty, Shop) *do* point to real intended
paths (`/electronics-gadgets`, `/health-beauty`, `/shop`) even though those pages don't exist until
Phase 5 — that's normal, expected nav scaffolding, not a bug; Next.js doesn't require `<Link>`
targets to resolve at build time.

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

`src/app/ui-preview/page.tsx` exists **only** to visually verify this design system (typography,
buttons, badges, Price states, real `ProductCard`s from Phase 2 data, container/section rhythm)
since the real homepage isn't built until Phase 4. It's marked `robots: { index: false, follow:
false }` and carries an on-page notice. **Remove or gate this route before production
deployment** — it is not, and must never become, part of the public site.

## 8. UI principles carried forward

- Server Components by default — only 4 files in `src/components/` are Client Components
  (`SearchBar`, `MobileNav`, `NavLinks`, `providers`), each for a concrete reason (react-aria
  interactivity, shared overlay state, `usePathname`, theme context).
- HeroUI v3 primitives (Button, Chip, SearchField, Drawer) retheme via CSS tokens, not forks —
  customize via `className`/props, never copy-paste HeroUI internals.
- Conversion-focused means clear price, clear CTA, clear delivery/COD trust signals near the
  point of decision — not just "looks premium."
- Accessible by default: rely on HeroUI/React Aria's primitives, don't strip them out for a
  custom look.
