# Product Data — Extraction Summary

Status: **Phase 2 complete**. This documents what was extracted from
`resources/products/` into `src/data/products.ts`, and its known gaps.
Source screenshots are the source of truth throughout — see
`CLAUDE.md` for the extraction rules this followed.

## Extracted count

**21 of 21** product folders extracted (100%).

| Category | Source folder | Count |
|---|---|---|
| Electronics & Gadgets (`electronics-gadgets`) | `resources/products/electric-product/` | 10 |
| Health & Beauty (`health-beauty`) | `resources/products/health-beauty/` | 11 |

Subcategory: all 10 electronics products show **"Electronic Accessories"**
as their supplier category, normalized to the `electronic-accessories`
subcategory slug. No health & beauty product shows a subcategory on its
source screenshot, so none was assigned — see `docs/ARCHITECTURE.md` /
`src/data/categories.ts` for the normalization mapping.

## Fields available

Present for **all 21** products: `title`, `sku`, `category`,
`pricing.wholesalePrice` (the supplier's per-unit price — Renvura's cost
basis, not a customer-facing price), `inventory.stock` and `unit` (from
the "Quantity" field shown on each listing), at least one product image.

Present for **most** products: `description`, `features` and/or
`specifications` (all 10 electronics products; about half of health &
beauty products — several health & beauty listings have only a
free-text description with no bulleted spec list).

Present for **some** products: `brand` (explicit on 7 of 10 electronics
products, either in the spec text or clearly printed on the packaging in
the photo; on 6 of 11 health & beauty products), `model` (6 of 10
electronics products — `X699`, `C16`, `Q18`, `K28`, `JY-2600`, `F15-2`;
no health & beauty product shows a model number), `bulkPricing`
quantity-break tiers (5 of 10 electronics products; no health & beauty
product shows tiered pricing), `shortDescription` (3 products, where the
page title and the site's own search-box/meta text disagreed and both
were kept rather than picking one).

## Fields commonly missing

- **`regularPrice` / `sellingPrice`** — null for all 21 products. The
  screenshots only show the supplier's wholesale/dropship price; Renvura
  has not set customer-facing prices yet. `status` is `"draft"` for the
  same reason.
- **`variants`** — none extracted. No product screenshot showed distinct
  purchasable variants (color/size options with separate SKUs/prices);
  where multiple colors appear in a product photo (e.g. the silicone
  body scrubber belt), the screenshot didn't confirm whether they're sold
  as a set or as separate options, so no variant array was invented.
- **`videos`** — none. No product folder in `resources/products/`
  contains a video file.
- **`subcategory`** — null for all 11 health & beauty products (see
  above).
- **`seo` (metaTitle/metaDescription)** — intentionally left unset for
  every product. Writing real SEO copy is Phase 12 work, not a
  mechanical extraction from source data.

## Source-data limitations / known issues

- **Needs manual review — `skin1004-centella-ampoule-100ml`**: the
  listing title says "100ml" and is priced well above the 30ml variant,
  but its product photo is identical to the 30ml listing
  (`skin1004-centella-ampoule-30ml`) and its description text still says
  "30ml Generous Quantity". Captured as shown; flagged in
  `source.dataQualityNotes` rather than silently trusted or corrected.
- **Bilingual descriptions**: several electronics listings
  (`c16-ai-selfie-stick-gimbal`, `q18-dual-axis-gimbal`,
  `cob-led-flashlight-dual-light`, `jysuper-jy2600-flashlight`,
  `f15-2-wireless-microphone`) have Bangla-language descriptions on the
  source screenshot. These were captured verbatim rather than translated,
  to avoid introducing wording the supplier didn't actually write. One
  (`f15-2-wireless-microphone`) was partly illegible at source
  resolution — only the legible portion was kept.
  <br />**Note to reviewer**: this file itself contains literal Bangla
  text copied from the source; if it renders as mojibake in your editor,
  that's an encoding-display issue, not a data error — verify against
  the source screenshot directly.
- **Templated supplier copy**: `bioaqua-lip-sleeping-mask`'s source
  description reads as auto-generated/templated text (it contains
  leftover fragments like "Step 1:", "No invalid information found").
  The `description` field is a cleaned paraphrase of the same verified
  claims, not new information.
- **Ambiguous packaging claim**: `jysuper-jy2600-flashlight`'s product
  photo shows a "6FT LONG (72 INCH)" graphic that isn't repeated in the
  text specification list and whose meaning is unclear (beam distance?
  an included cord?) — not captured as a spec rather than guessed.
- **Ambiguous quantity wording**: `lanbena-blackhead-remover-mask`'s
  title says "5 pc" while the spec block says "Product weight: 5g" —
  unclear whether the pack contains 5 masks or the title is just
  restating the weight. Not resolved from the screenshot.

## What this data is (and isn't) for

`src/data/products.ts` is a **verified extraction**, not a finished
storefront catalog. Before Phase 4 (homepage) or Phase 5/6 (listing/
detail pages) use this data for real, the business still needs to:
review the flagged 100ml/30ml SKIN1004 listing with the supplier, decide
`regularPrice`/`sellingPrice` markup over the captured wholesale price,
and flip `status` from `draft` to `active` per product.
