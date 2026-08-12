import { ProductCard } from "./ProductCard";
import type { PublicProduct } from "@/types/product";

interface ProductGridProps {
  products: PublicProduct[];
  /** slug (category or subcategory) -> display name, built once by the caller — see `ProductCard`'s `categoryLabel` doc comment. */
  categoryLabels?: Record<string, string>;
  className?: string;
}

/** Shared dense responsive grid (reference: ~5 columns at desktop width). */
export function ProductGrid({ products, categoryLabels, className }: ProductGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 ${className ?? ""}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          categoryLabel={categoryLabels?.[product.subcategory ?? product.category]}
        />
      ))}
    </div>
  );
}
