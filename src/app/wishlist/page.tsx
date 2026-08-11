import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { WishlistGrid } from "@/components/wishlist/WishlistGrid";
import { getAllProducts, toPublicProduct } from "@/services/products";

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Wishlist" }];

/**
 * Server Component: fetches and sanitizes the catalog here, then hands it
 * to `WishlistGrid` (Client Component) to filter by the client-only
 * wishlist slugs. Splitting it this way — rather than calling
 * `getAllProducts()` directly inside a "use client" file, as this route
 * did in Phase 7 — keeps `wholesalePrice` out of the client JS bundle; see
 * `PublicProduct`'s doc comment in `src/types/product.ts`.
 */
export default function WishlistPage() {
  const products = getAllProducts().map(toPublicProduct);

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Wishlist</h1>
      <WishlistGrid products={products} />
    </Container>
  );
}
