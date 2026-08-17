import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/types/category";
import type { PublicProduct } from "@/types/product";

interface ShopByCategoryProps {
  categories: Category[];
  /** Used only to derive each circle's representative photo — see `CategoryHighlights`' identical pattern. Never rendered as price/stock data. */
  products: PublicProduct[];
}

/** A category's own real product photo — never a stock/placeholder image, matching `CategoryHighlights`' existing rule. */
function representativeImage(category: Category, products: PublicProduct[]): string | null {
  const match = products.find(
    (product) => (product.category === category.slug || product.subcategory === category.slug) && product.media.images.length > 0,
  );
  return match ? match.media.images[0] : null;
}

/**
 * Quick category-navigation row — real product photography in a circular
 * frame, one line of real category names beneath. Placed directly under
 * the hero so "browse by category" is the first real decision a visitor
 * can make, before any product grid. A category with no real product photo
 * (no active products yet) is skipped, same as `CategoryHighlights`.
 */
export function ShopByCategory({ categories, products }: ShopByCategoryProps) {
  const cards = categories
    .map((category) => ({ category, image: representativeImage(category, products) }))
    .filter((card): card is { category: Category; image: string } => card.image !== null);

  if (cards.length === 0) return null;

  return (
    <div>
      <h2 className="text-h2 text-center text-foreground">Shop by Category</h2>
      <div className="mt-8 flex justify-center gap-5 overflow-x-auto pb-2 sm:gap-8 md:flex-wrap md:justify-center">
        {cards.map(({ category, image }) => (
          <Link key={category.slug} href={`/shop?category=${category.slug}`} className="group flex w-20 shrink-0 flex-col items-center gap-2.5 sm:w-24">
            <span className="relative size-20 overflow-hidden rounded-full border border-border bg-surface-soft shadow-card transition-shadow group-hover:shadow-card-hover sm:size-24">
              <Image src={image} alt="" fill sizes="96px" className="object-cover transition-transform duration-300 group-hover:scale-[1.06]" />
            </span>
            <span className="text-center text-xs font-medium text-foreground group-hover:text-accent sm:text-small">{category.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
