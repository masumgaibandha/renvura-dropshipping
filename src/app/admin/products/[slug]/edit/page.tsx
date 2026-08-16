import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { IconArrowLeft } from "@/components/ui/icons";
import { getAllCategories, getProductBySlug } from "@/services/products";
import { formatBDT } from "@/utils/currency";

export default async function AdminEditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, categories] = await Promise.all([getProductBySlug(slug), getAllCategories()]);
  if (!product) notFound();

  const initialValues: ProductFormValues = {
    title: product.title,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    category: product.category,
    subcategory: product.subcategory ?? "",
    brand: product.brand ?? "",
    model: product.model ?? "",
    sku: product.sku ?? "",
    regularPrice: product.pricing.regularPrice !== null ? String(product.pricing.regularPrice) : "",
    sellingPrice: product.pricing.sellingPrice !== null ? String(product.pricing.sellingPrice) : "",
    stock: product.inventory.stock !== null ? String(product.inventory.stock) : "",
    shippingWeightGrams: product.inventory.shippingWeightGrams !== null ? String(product.inventory.shippingWeightGrams) : "",
    inventoryStatus: product.inventory.status,
    status: product.status,
    featured: product.featured ?? false,
    thumbnail: product.media.thumbnail ?? "",
    images: product.media.images.join("\n"),
    features: (product.features ?? []).join("\n"),
    specifications: (product.specifications ?? []).map((spec) => `${spec.label}: ${spec.value}`).join("\n"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-small font-medium text-foreground/70 hover:text-foreground">
          <IconArrowLeft className="size-4" />
          Back to products
        </Link>
        <h1 className="mt-2 text-h2 font-semibold text-foreground">{product.title}</h1>
        <p className="mt-1 text-small text-foreground/70">
          Wholesale cost (internal only, never shown to customers): <span className="font-medium text-foreground">{formatBDT(product.pricing.wholesalePrice)}</span>
        </p>
        {product.supplier && (
          <p className="mt-1 text-small text-foreground/70">
            Supplier (internal only): <span className="font-medium text-foreground">{product.supplier.provider}</span> · ref{" "}
            <span className="font-medium text-foreground">{product.supplier.productId}</span> · last checked{" "}
            <span className="font-medium text-foreground">{product.supplier.lastCheckedAt}</span> ·{" "}
            <a href={product.supplier.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              source page
            </a>
          </p>
        )}
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface p-5">
        <ProductForm mode="edit" slug={slug} categories={categories} initialValues={initialValues} />
      </div>
    </div>
  );
}
