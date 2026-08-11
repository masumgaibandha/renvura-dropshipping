import { ProductCard } from "@/components/ecommerce/ProductCard";
import type { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
  className?: string;
}

/** Shared dense responsive grid (reference: ~5 columns at desktop width). */
export function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${className ?? ""}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
