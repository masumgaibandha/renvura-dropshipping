import Image from "next/image";

const storyImages = [
  { src: "/products/electronics-gadgets/foldable-laptop-stand/image-1.jpg", alt: "Foldable laptop stand" },
  { src: "/products/electronics-gadgets/car-phone-holder-360/image-1.jpg", alt: "360° car phone holder" },
  { src: "/products/health-beauty/beauty-of-joseon-sunscreen-10ml/image-1.jpg", alt: "Beauty of Joseon sunscreen" },
  { src: "/products/health-beauty/bioaqua-lip-sleeping-mask/image-1.jpg", alt: "Bioaqua lip sleeping mask" },
];

/**
 * "Our Story" section — reference composition: large visual left, short
 * eyebrow/heading/copy right. The visual is a collage of real product
 * photos (not a fabricated lifestyle scene). Copy is deliberately modest —
 * no invented history, customer counts, or market-leadership claims.
 */
export function BrandStory() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="grid grid-cols-2 gap-3">
        {storyImages.map((image) => (
          <div key={image.src} className="relative aspect-square overflow-hidden rounded-xl bg-background-secondary">
            <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
          </div>
        ))}
      </div>

      <div>
        <p className="text-label text-accent uppercase">Our Story</p>
        <h2 className="text-h2 mt-2 text-foreground">Useful Products for Everyday Life</h2>
        <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded-full bg-brand-gold" />

        <div className="mt-5 space-y-4 text-body text-secondary-text">
          <p>Renvura brings together practical electronics, gadgets, and health &amp; beauty essentials for everyday life in Bangladesh.</p>
          <p>Every product is sourced from verified suppliers, and every order ships with Cash on Delivery available nationwide.</p>
          <p>We&apos;re building the catalog carefully, category by category, rather than listing everything at once.</p>
        </div>
      </div>
    </div>
  );
}
