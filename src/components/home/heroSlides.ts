import type { ComponentType, SVGProps } from "react";

import { IconBag, IconBolt, IconHanger, IconHome, IconSparkle } from "@/components/ui/icons";

export interface HeroSlide {
  id: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** "dark" = navy text panel with light text; "light" = cream text panel with navy text. Alternated for editorial rhythm across the strip. Desktop-only — the mobile layout overlays every slide's text on a consistent navy scrim regardless of tone, see HeroSlider.tsx. */
  tone: "dark" | "light";
  /** Path under public/, e.g. "/images/home/hero-slides/electronics.jpg". See that directory's own note on provenance. */
  image: string;
  /**
   * CSS object-position for the image's object-cover crop, computed (not eyeballed) per photo
   * from each photo's real pixel dimensions against the two layout contexts' actual container
   * aspect ratios — see HeroSlider.tsx's doc comment for the worked math and why the desktop
   * split panel (wide-short, most cropping at the widest viewports) and the sub-lg overlay
   * (which stays width-constrained, and therefore still crops significantly, all the way up to
   * 1023px — not just at true phone widths) needed to be computed and verified separately even
   * though they land on the same value for every photo in this initial set.
   */
  imagePositionDesktop: string;
  imagePositionMobile: string;
}

/**
 * Hero slider content — one slide per major storefront category plus a
 * closing general/brand slide, per the Phase 24 hero redesign brief. Pure
 * presentation data, not product/business data: copy states only true,
 * already-approved facts (real category names, real routes), never a
 * discount/stock/review claim — same "never fabricate" discipline as every
 * other homepage section (see CategoryHighlights.tsx). `ctaHref` uses the
 * same `/shop?category=<slug>` pattern already confirmed to resolve for
 * every category (see CLAUDE.md's category-navigation note).
 *
 * Images live in public/images/home/hero-slides/ — real product/lifestyle
 * photography sourced from the supplier's own wider marketplace catalog
 * (SelfShop), hand-picked for genuinely premium, clutter-free composition
 * (no marketplace watermarks, no discount stickers, no competitor branding
 * dominating the frame, no counterfeit-looking products) rather than the
 * busy AliExpress-style marketing photography that most of the already-
 * ingested Renvura catalog images carry — see that directory's own README
 * for the full per-image source reference and selection notes.
 */
export const heroSlides: HeroSlide[] = [
  {
    id: "electronics-gadgets",
    eyebrow: "Electronics & Gadgets",
    headline: "Everyday Tech, Delivered Right",
    subtext: "Practical electronics and gadgets for daily life — audio, accessories, and more.",
    ctaLabel: "Shop Electronics",
    ctaHref: "/shop?category=electronics-gadgets",
    Icon: IconBolt,
    tone: "dark",
    image: "/images/home/hero-slides/electronics.jpg",
    // The earbud tips are the topmost subject pixels, ~5% down from the top of the 1080x1082
    // source. 3% keeps a hair of margin above them without wasting crop budget on the plain
    // background — verified against the widest desktop split panel (~1920px, worst case) and
    // the 768px overlay (also width-constrained, see the interface doc comment).
    imagePositionDesktop: "center 3%",
    imagePositionMobile: "center 3%",
  },
  {
    id: "health-beauty",
    eyebrow: "Health & Beauty",
    headline: "Skincare & Self-Care, Simplified",
    subtext: "Trusted skincare and personal care essentials for your everyday routine.",
    ctaLabel: "Shop Health & Beauty",
    ctaHref: "/shop?category=health-beauty",
    Icon: IconSparkle,
    tone: "light",
    image: "/images/home/hero-slides/beauty.jpg",
    // The wheat sprig prop is the topmost subject element, ~18% down from the top of the
    // 1080x1063 source. 30% leaves a clear margin above it (the old 45% cropped close enough to
    // risk clipping its tip at the widest viewports).
    imagePositionDesktop: "center 30%",
    imagePositionMobile: "center 30%",
  },
  {
    id: "fashion",
    eyebrow: "Fashion & Accessories",
    headline: "Style That Fits Your Day",
    subtext: "Sarees, apparel, and accessories chosen for everyday wear.",
    ctaLabel: "Shop Fashion",
    ctaHref: "/shop?category=fashion",
    Icon: IconHanger,
    tone: "dark",
    image: "/images/home/hero-slides/fashion.jpg",
    // The model's hair already reaches essentially the very top edge of the 1080x1396 source —
    // 0% crops nothing from the top (all the cropping this portrait photo needs happens at the
    // bottom instead), which is the only value that guarantees the complete head/hair survives
    // at the widest, most-cropped desktop viewports. The old 15% was cropping roughly 15% of the
    // source's height off the top, well into the hairline.
    imagePositionDesktop: "center 0%",
    imagePositionMobile: "center 0%",
  },
  {
    id: "home-lifestyle",
    eyebrow: "Home & Lifestyle",
    headline: "Thoughtful Finds for Home",
    subtext: "Practical essentials that make everyday living a little easier.",
    ctaLabel: "Shop Home & Lifestyle",
    ctaHref: "/shop?category=home-lifestyle",
    Icon: IconHome,
    tone: "light",
    image: "/images/home/hero-slides/home-lifestyle.jpg",
    // Re-verified against the same worst-case math as the other slides: the decanter tops that
    // sit above the floral/bottle composition are already cropped in the source photo itself, so
    // 30% only ever crops further into that already-blurred background, never into the flowers
    // or the perfume bottle — unchanged from the first pass.
    imagePositionDesktop: "center 30%",
    imagePositionMobile: "center 30%",
  },
  {
    id: "general",
    eyebrow: "Renvura",
    headline: "Everything You Need, One Store",
    subtext: "Shop every category with Cash on Delivery, available nationwide.",
    ctaLabel: "Explore All Categories",
    ctaHref: "/shop",
    Icon: IconBag,
    tone: "dark",
    image: "/images/home/hero-slides/renvura-lifestyle.jpg",
    // The square 1080x1080 source can't show the full pinching hand (top) and the full earring
    // tassels (bottom) at once at this crop ratio — there simply isn't enough vertical window for
    // both. Centered keeps the earrings themselves (the actual product) fully framed, only
    // trimming the fingertips at the very top; re-verified this is the better tradeoff than
    // biasing toward the hand and cutting into the tassels instead.
    imagePositionDesktop: "center 50%",
    imagePositionMobile: "center 50%",
  },
];
