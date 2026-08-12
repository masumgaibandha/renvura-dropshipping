import Link from "next/link";

import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { IconArrowLeft } from "@/components/ui/icons";
import { getAllCategories } from "@/services/products";

const EMPTY_VALUES: ProductFormValues = {
  title: "",
  shortDescription: "",
  description: "",
  category: "",
  subcategory: "",
  brand: "",
  model: "",
  sku: "",
  regularPrice: "",
  sellingPrice: "",
  stock: "",
  inventoryStatus: "unknown",
  status: "draft",
  featured: false,
  thumbnail: "",
  images: "",
  features: "",
  specifications: "",
};

export default async function AdminNewProductPage() {
  const categories = await getAllCategories();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-small font-medium text-foreground/70 hover:text-foreground">
          <IconArrowLeft className="size-4" />
          Back to products
        </Link>
        <h1 className="mt-2 text-h2 font-semibold text-foreground">New Product</h1>
        <p className="mt-1 text-small text-foreground/70">
          Created here as a draft with no wholesale cost recorded — this product has no supplier-screenshot source. Set it to &quot;active&quot; once it&apos;s ready for the storefront.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface p-5">
        <ProductForm mode="create" slug="" categories={categories} initialValues={EMPTY_VALUES} />
      </div>
    </div>
  );
}
