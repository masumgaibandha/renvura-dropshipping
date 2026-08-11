import Image from "next/image";
import Link from "next/link";

/**
 * Homepage hero — a single image-led banner using the approved campaign
 * artwork (resources/hero.png, copied to public/images/home/hero.png; the
 * original in resources/ is untouched). The artwork already contains the
 * complete composition — Renvura branding, headline, supporting copy, the
 * "Shop Now" CTA, and the product composition — so nothing is re-rendered
 * on top of it; that would duplicate the same content in the DOM. The
 * image is exactly 3:1 (2172×724), matching the container's aspect ratio
 * exactly, so `object-contain` shows it at any width with no cropping and
 * no letterboxing. The whole banner is a single link to /shop since the
 * "Shop Now" CTA baked into the image isn't itself interactive.
 *
 * The aspect ratio is set as an inline style, not just the `aspect-[3/1]`
 * Tailwind class, on purpose: `next/image`'s `fill` mode makes the image
 * `position: absolute`, which takes it out of normal flow — if the
 * aspect-ratio rule for any reason isn't present in the compiled CSS (this
 * broke once already, from a Turbopack dev-cache staleness bug where the
 * class silently never made it into the dev bundle even though `npm run
 * build` compiled it correctly), the container has no defined height and
 * collapses to zero, and the entire hero disappears. The inline style
 * can't be dropped by a CSS pipeline issue since React applies it directly
 * to the element.
 */
export function HeroBanner() {
  return (
    <Link
      href="/shop"
      aria-label="Shop Renvura products"
      style={{ aspectRatio: "3 / 1" }}
      className="relative block w-full overflow-hidden rounded-2xl bg-background"
    >
      <Image
        src="/images/home/hero.png"
        alt="Renvura — Everyday Essentials delivered across Bangladesh, featuring gadgets and health and beauty products"
        fill
        priority
        sizes="100vw"
        className="object-contain"
      />
    </Link>
  );
}
