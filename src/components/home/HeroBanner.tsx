import Image from "next/image";
import Link from "next/link";

/**
 * Homepage hero — reference proportions: a large, rounded, wide-landscape
 * banner with left-aligned text over an image/graphic. The background here
 * is a temporary placeholder (a real product photo over a soft gradient,
 * not a fabricated lifestyle scene) pending real hero photography — flagged
 * here rather than silently treated as final. Copy is category-based and
 * truthful (no invented promotions).
 */
export function HeroBanner() {
  return (
    <div className="relative isolate flex aspect-[16/9] w-full items-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent-soft via-background-secondary to-background sm:aspect-[21/9] lg:aspect-[21/7]">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-3/5 sm:w-1/2"
      >
        <Image
          src="/products/electronics-gadgets/x699-turbo-fan/image-1.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 640px) 50vw, 60vw"
          className="object-cover object-center opacity-90 [mask-image:linear-gradient(to_right,transparent,black_25%)]"
        />
      </div>

      <div className="relative z-10 max-w-lg px-6 py-8 sm:px-10 lg:px-14">
        <p className="text-label text-accent uppercase">Electronics &amp; Gadgets · Health &amp; Beauty</p>
        <h1 className="text-display mt-3 text-foreground">Everyday Essentials, Delivered Across Bangladesh</h1>
        <p className="text-body mt-4 max-w-sm text-foreground/70">
          Handpicked gadgets and health &amp; beauty products, with Cash on Delivery nationwide.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Explore Products
        </Link>
      </div>
    </div>
  );
}
