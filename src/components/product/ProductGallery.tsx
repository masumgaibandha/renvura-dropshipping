"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

/**
 * Product image gallery: one simple horizontal thumbnail row at every
 * breakpoint rather than a desktop-column/mobile-row split. The original
 * Phase 2 catalog never had more than 2 images per product, but the
 * Phase 17-22 SelfShop-imported catalog regularly has 4-6 — the thumbnail
 * row scrolls horizontally (`overflow-x-auto`) once it doesn't fit, rather
 * than overflowing the page on narrow viewports. `object-contain` (not
 * `object-cover`, like ProductCard's grid thumbnail uses) so a real
 * supplier photo's full composition is never cropped on its own detail page.
 */
export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultipleImages = images.length > 1;
  const activeImage = images[activeIndex] ?? images[0];

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-surface-soft text-small text-foreground/70">
        No image
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-soft">
        <Image src={activeImage} alt={title} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain" />
      </div>

      {hasMultipleImages && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1} of ${images.length} for ${title}`}
              aria-current={index === activeIndex}
              className={`relative size-16 shrink-0 overflow-hidden rounded-lg border bg-surface-soft transition-colors md:size-20 ${
                index === activeIndex ? "border-accent" : "border-border hover:border-accent"
              }`}
            >
              <Image src={image} alt="" fill sizes="80px" className="object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
