import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import { Container } from "@/components/layout/Container";
import { BuyBox } from "@/components/product/BuyBox";
import { DeliveryPaymentInfo } from "@/components/product/DeliveryPaymentInfo";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { brand, isConfigured } from "@/config/brand";
import { getAllProducts, getCategoryBySlug, getProductBySlug, getRelatedProducts, toPublicProduct } from "@/services/products";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/** Static-generates every real product page at build time — the catalog is local/static, no DB. */
export function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return {};
  }

  const description = product.shortDescription ?? product.description ?? undefined;
  const image = product.media.thumbnail ?? product.media.images[0];

  return {
    title: product.title,
    description,
    ...(isConfigured(brand.urls.site) ? { alternates: { canonical: `/products/${product.slug}` } } : {}),
    openGraph: {
      title: product.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

/** schema.org InStock/OutOfStock — omitted entirely for "unknown", never guessed. */
function availabilitySchema(status: string): string | undefined {
  if (status === "in_stock") return "https://schema.org/InStock";
  if (status === "out_of_stock") return "https://schema.org/OutOfStock";
  return undefined;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const category = getCategoryBySlug(product.subcategory ?? product.category);
  const allProducts = getAllProducts();
  const related = getRelatedProducts(product, allProducts, 5);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...(category ? [{ label: category.name, href: `/${product.category}` }] : []),
    { label: product.title },
  ];

  const availability = availabilitySchema(product.inventory.status);

  // Product JSON-LD — only verified fields. `offers` is omitted entirely (not emitted with a
  // fabricated price) whenever sellingPrice is null; wholesalePrice is never read here.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription ?? product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: product.media.images.length > 0 ? product.media.images : undefined,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.pricing.sellingPrice !== null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: product.pricing.currency,
            price: product.pricing.sellingPrice,
            ...(availability ? { availability } : {}),
          },
        }
      : {}),
  };

  return (
    <Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumbs items={breadcrumbItems} className="mb-4" />

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.media.images} title={product.title} />

        <div>
          <BuyBox product={toPublicProduct(product)} categoryLabel={category?.name} />
          <DeliveryPaymentInfo className="mt-6" />
        </div>
      </div>

      <ProductDetails product={product} className="mt-12" />

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-h2 mb-6">Related Products</h2>
          <ProductGrid products={related} />
        </div>
      )}
    </Container>
  );
}
