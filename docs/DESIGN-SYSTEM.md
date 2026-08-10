# Design System — Initial Conclusions

This document captures what can be reliably derived from the two visual inputs supplied at
project start: the official Renvura brand assets (`assets/`) and the layout reference
(`resources/reference-theme.png`). It is a starting direction, not a finished system — expect it
to be extended once real UI gets built in Phase 3+.

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

## 3. Typography direction

- The wordmark uses a bold, geometric sans — pair body/UI type with a clean geometric or
  humanist sans (the current scaffold uses Geist via `next/font/google`, which fits this
  direction reasonably well as a placeholder).
- The reference theme's headline type is a large serif/display face for hero moments. Whether
  Renvura adopts a display serif for hero headlines (echoing the reference's premium editorial
  feel) or stays all-sans (echoing the logo's geometric sans) is an open decision for Phase 3 —
  not decided here.
- Strong hierarchy: large hero headline → small letter-spaced eyebrow/section labels (as seen in
  both the logo's "AUTHORITY · REFINED" caption and the reference's section labels) → simple,
  restrained product-card typography (title, price — no clutter).

## 4. Spacing direction

- Generous, consistent vertical rhythm between sections (the reference never crowds sections
  together).
- Wide gutters in product grids over cramming more columns in.
- Let photography breathe — full-bleed or near-full-bleed hero and promo sections rather than
  boxed-in imagery.
Exact spacing scale (4px/8px base, section padding values, etc.) will be defined in Phase 3 when
the global layout is actually built, using Tailwind's default scale as the starting point.

## 5. Light/dark usage

- `next-themes` (class-based) is wired up in `src/components/layout/providers.tsx`, defaulting to
  light mode — commerce sites generally default to light, and light is where product photography
  reads best.
- Dark mode exists primarily so the dark brand assets (navy backgrounds) have a correct home, and
  for user preference — it is not the primary experience.
- Tailwind tokens `--color-background` / `--color-foreground` already flip between cream-ish/navy
  and navy/cream via the `.dark` class (see `src/app/globals.css`) as the starting point; product
  imagery and card surfaces will need their own review once real components exist.

## 6. UI principles carried into Phase 3+

- Server Components by default; interactivity is the exception, not the default.
- HeroUI v3 components as the base primitives (buttons, inputs, etc.) — customize via Tailwind
  classes/`tailwind-variants`, don't fork or reimplement HeroUI components.
- Conversion-focused means: clear price, clear CTA, clear delivery/COD trust signals near the
  point of decision — not just "looks premium."
- Accessible by default: rely on HeroUI/React Aria's accessibility primitives, don't strip them
  out for a custom look.
