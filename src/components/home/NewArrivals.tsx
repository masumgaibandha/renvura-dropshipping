import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import type { PublicProduct } from "@/types/product";

interface NewArrivalsProps {
  products: PublicProduct[];
  categoryLabels?: Record<string, string>;
}

/**
 * "New Arrivals" — genuinely sorted by `Product.createdAt` (a real Mongoose
 * timestamp, see `src/models/Product.ts`), never a fabricated "new" flag.
 * The caller (`src/app/page.tsx`) is responsible for the sort/slice and for
 * only rendering this section when there are real products to show; this
 * component itself has no fallback/placeholder state, matching the
 * "gracefully omit, never fabricate" rule used throughout the catalog UI.
 */
export function NewArrivals({ products, categoryLabels }: NewArrivalsProps) {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-h2 text-foreground">New Arrivals</h2>
          <p className="mt-1 text-small text-foreground/70">Recently added to our catalog.</p>
        </div>
      </div>
      <ProductGrid products={products} categoryLabels={categoryLabels} mobileCarousel />
    </div>
  );
}
