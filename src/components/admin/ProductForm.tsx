"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { adminCreateProduct, adminUpdateProduct } from "@/actions/admin/products";
import type { InventoryStatus, ProductStatus } from "@/types/product";

export interface ProductFormCategoryOption {
  slug: string;
  name: string;
  parentSlug?: string | null;
}

export interface ProductFormValues {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  sku: string;
  regularPrice: string;
  sellingPrice: string;
  stock: string;
  shippingWeightGrams: string;
  inventoryStatus: InventoryStatus;
  status: ProductStatus;
  featured: boolean;
  thumbnail: string;
  images: string;
  features: string;
  specifications: string;
}

interface ProductFormProps {
  mode: "create" | "edit";
  slug: string;
  categories: ProductFormCategoryOption[];
  initialValues: ProductFormValues;
}

const PRODUCT_STATUS_VALUES: ProductStatus[] = ["draft", "active", "inactive"];
const INVENTORY_STATUS_VALUES: InventoryStatus[] = ["in_stock", "out_of_stock", "unknown"];

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseSpecifications(value: string): { label: string; value: string }[] {
  return parseLines(value)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) return null;
      const label = line.slice(0, separatorIndex).trim();
      const specValue = line.slice(separatorIndex + 1).trim();
      if (!label || !specValue) return null;
      return { label, value: specValue };
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null);
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/** Shared create/edit form for /admin/products — a plain controlled form, not a heavier form library, since the field count and validation are modest. Image/thumbnail fields are text paths under /products/ (no upload infra exists yet — see CLAUDE.md's Phase 10 homepage-management note making the same call). */
export function ProductForm({ mode, slug, categories, initialValues }: ProductFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [slugInput, setSlugInput] = useState(mode === "create" ? "" : slug);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const topCategories = categories.filter((category) => !category.parentSlug);
  const subcategories = categories.filter((category) => category.parentSlug === values.category);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const regularPrice = toNullableNumber(values.regularPrice);
    const sellingPrice = toNullableNumber(values.sellingPrice);
    const stock = toNullableNumber(values.stock);
    const shippingWeightGrams = toNullableNumber(values.shippingWeightGrams);
    if (Number.isNaN(regularPrice) || Number.isNaN(sellingPrice) || Number.isNaN(stock) || Number.isNaN(shippingWeightGrams)) {
      setError("Prices, stock, and weight must be numbers, or left empty.");
      return;
    }
    if (stock !== null && !Number.isInteger(stock)) {
      setError("Stock must be a whole number.");
      return;
    }
    if (shippingWeightGrams !== null && shippingWeightGrams < 0) {
      setError("Shipping weight must be zero or more.");
      return;
    }

    const payload = {
      title: values.title.trim(),
      shortDescription: values.shortDescription.trim() || null,
      description: values.description.trim() || null,
      category: values.category,
      subcategory: values.subcategory || null,
      brand: values.brand.trim() || null,
      model: values.model.trim() || null,
      sku: values.sku.trim() || null,
      regularPrice,
      sellingPrice,
      stock,
      shippingWeightGrams,
      inventoryStatus: values.inventoryStatus,
      status: values.status,
      featured: values.featured,
      thumbnail: values.thumbnail.trim() || null,
      images: parseLines(values.images),
      features: parseLines(values.features),
      specifications: parseSpecifications(values.specifications),
    };

    startTransition(async () => {
      const result = mode === "create" ? await adminCreateProduct(slugInput.trim(), payload) : await adminUpdateProduct(slug, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (mode === "create") {
        router.push(`/admin/products/${slugInput.trim()}/edit`);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {mode === "create" && (
        <Field label="Slug">
          <input
            value={slugInput}
            onChange={(event) => setSlugInput(event.target.value)}
            placeholder="e.g. wireless-earbuds-x1"
            required
            className="h-9 w-full max-w-md rounded-lg border border-border bg-background px-3 text-small text-foreground"
          />
        </Field>
      )}

      <Field label="Title">
        <input value={values.title} onChange={(event) => update("title", event.target.value)} required className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
      </Field>

      <Field label="Short Description">
        <input value={values.shortDescription} onChange={(event) => update("shortDescription", event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
      </Field>

      <Field label="Description">
        <textarea value={values.description} onChange={(event) => update("description", event.target.value)} rows={4} className="w-full rounded-lg border border-border bg-background p-3 text-small text-foreground" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            value={values.category}
            onChange={(event) => update("category", event.target.value)}
            required
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-small text-foreground"
          >
            <option value="" disabled>Select a category</option>
            {topCategories.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Subcategory">
          <select value={values.subcategory} onChange={(event) => update("subcategory", event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-small text-foreground">
            <option value="">None</option>
            {subcategories.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Brand">
          <input value={values.brand} onChange={(event) => update("brand", event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </Field>
        <Field label="Model">
          <input value={values.model} onChange={(event) => update("model", event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </Field>
        <Field label="SKU">
          <input value={values.sku} onChange={(event) => update("sku", event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Regular Price (৳)">
          <input value={values.regularPrice} onChange={(event) => update("regularPrice", event.target.value)} inputMode="decimal" placeholder="Empty = unset" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </Field>
        <Field label="Selling Price (৳)">
          <input value={values.sellingPrice} onChange={(event) => update("sellingPrice", event.target.value)} inputMode="decimal" placeholder="Empty = unavailable for purchase" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </Field>
        <Field label="Stock">
          <input value={values.stock} onChange={(event) => update("stock", event.target.value)} inputMode="numeric" placeholder="Empty = unknown" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Shipping Weight (grams)">
          <input
            value={values.shippingWeightGrams}
            onChange={(event) => update("shippingWeightGrams", event.target.value)}
            inputMode="numeric"
            placeholder="Empty = unknown (blocks courier API shipment creation)"
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground"
          />
        </Field>
        <Field label="Stock Status">
          <select value={values.inventoryStatus} onChange={(event) => update("inventoryStatus", event.target.value as InventoryStatus)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-small text-foreground">
            {INVENTORY_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>{value.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Product Status">
          <select value={values.status} onChange={(event) => update("status", event.target.value as ProductStatus)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-small text-foreground">
            {PRODUCT_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </Field>
        <Field label="Featured on homepage">
          <label className="flex h-9 items-center gap-2 text-small text-foreground">
            <input type="checkbox" checked={values.featured} onChange={(event) => update("featured", event.target.checked)} className="size-4" />
            Show in featured row
          </label>
        </Field>
      </div>

      <Field label="Thumbnail path">
        <input value={values.thumbnail} onChange={(event) => update("thumbnail", event.target.value)} placeholder="/products/category/product-1/image-1.jpg" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
      </Field>

      <Field label="Image paths (one per line)">
        <textarea value={values.images} onChange={(event) => update("images", event.target.value)} rows={3} placeholder="/products/category/product-1/image-1.jpg" className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground" />
      </Field>

      <Field label="Features (one per line)">
        <textarea value={values.features} onChange={(event) => update("features", event.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background p-3 text-small text-foreground" />
      </Field>

      <Field label="Specifications (one per line, Label: Value)">
        <textarea value={values.specifications} onChange={(event) => update("specifications", event.target.value)} rows={3} placeholder="Battery: 2000mAh" className="w-full rounded-lg border border-border bg-background p-3 text-small text-foreground" />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-small text-green-700">
          Saved.
        </p>
      )}

      <div>
        <Button type="submit" variant="primary" isDisabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-foreground/70">{label}</span>
      {children}
    </label>
  );
}
