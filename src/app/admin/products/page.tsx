import Image from "next/image";
import Link from "next/link";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { PathaoReadinessBadge } from "@/components/admin/StatusBadge";
import { getPathaoProductReadiness } from "@/lib/courier/readiness";
import { getAllCategories, listProductsForAdmin } from "@/services/products";
import type { InventoryStatus, ProductStatus } from "@/types/product";
import { formatBDT } from "@/utils/currency";

const PRODUCT_STATUS_VALUES: ProductStatus[] = ["draft", "active", "inactive"];
const STOCK_STATUS_VALUES: InventoryStatus[] = ["in_stock", "out_of_stock", "unknown"];

type RawSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const category = firstParam(params.category);
  const status = firstParam(params.status) as ProductStatus | undefined;
  const stock = firstParam(params.stock) as InventoryStatus | undefined;
  const page = Number.parseInt(firstParam(params.page) ?? "1", 10) || 1;

  const [result, categories] = await Promise.all([
    listProductsForAdmin({
      page,
      search,
      category,
      status: status && PRODUCT_STATUS_VALUES.includes(status) ? status : undefined,
      stock: stock && STOCK_STATUS_VALUES.includes(stock) ? stock : undefined,
    }),
    getAllCategories(),
  ]);
  const categoryBySlug = new Map(categories.map((item) => [item.slug, item.name]));

  function pageHref(pageNumber: number): string {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (category) query.set("category", category);
    if (status) query.set("status", status);
    if (stock) query.set("stock", stock);
    if (pageNumber > 1) query.set("page", String(pageNumber));
    const qs = query.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Products</h1>
          <p className="mt-1 text-small text-foreground/70">{result.total} product{result.total === 1 ? "" : "s"}</p>
        </div>
        <Link href="/admin/products/new" className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover">
          New Product
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-foreground/70">Search</label>
          <input id="q" name="q" defaultValue={search} placeholder="Title, SKU, or model" className="h-9 w-56 rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-xs font-medium text-foreground/70">Category</label>
          <select id="category" name="category" defaultValue={category ?? ""} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground">
            <option value="">Any</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium text-foreground/70">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground">
            <option value="">Any</option>
            {PRODUCT_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="stock" className="text-xs font-medium text-foreground/70">Stock</label>
          <select id="stock" name="stock" defaultValue={stock ?? ""} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground">
            <option value="">Any</option>
            {STOCK_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>{value.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover">
          Filter
        </button>
        {(search || category || status || stock) && (
          <Link href="/admin/products" className="h-9 inline-flex items-center text-small font-medium text-foreground/70 hover:text-foreground">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[960px] text-small">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/70">
              <th className="p-3 font-medium">Image</th>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">SKU / Model</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Selling Price</th>
              <th className="p-3 font-medium">Display Price</th>
              <th className="p-3 font-medium">Stock</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Featured</th>
              <th className="p-3 font-medium">Pathao Readiness</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {result.products.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-foreground/70">
                  No products match these filters.
                </td>
              </tr>
            ) : (
              result.products.map((product) => (
                <tr key={product.slug} className="border-b border-border last:border-0">
                  <td className="p-3">
                    {product.media.thumbnail ? (
                      <Image src={product.media.thumbnail} alt="" width={40} height={40} className="size-10 rounded-md object-cover" />
                    ) : (
                      <div className="size-10 rounded-md bg-background-secondary" />
                    )}
                  </td>
                  <td className="p-3 font-medium text-foreground">
                    <Link href={`/admin/products/${product.slug}/edit`} className="hover:text-accent hover:underline">
                      {product.title}
                    </Link>
                  </td>
                  <td className="p-3 text-foreground/70">{product.sku ?? product.model ?? "—"}</td>
                  <td className="p-3 text-foreground/70">{categoryBySlug.get(product.category) ?? product.category}</td>
                  <td className="p-3 text-foreground">{formatBDT(product.pricing.sellingPrice)}</td>
                  <td className="p-3 text-foreground/70">{formatBDT(product.pricing.regularPrice)}</td>
                  <td className="p-3 text-foreground/70">{product.inventory.stock ?? "—"}</td>
                  <td className="p-3 text-foreground/70">{product.status}</td>
                  <td className="p-3 text-foreground/70">{product.featured ? "Yes" : "—"}</td>
                  <td className="p-3">
                    <PathaoReadinessBadge readiness={getPathaoProductReadiness(product.inventory.shippingWeightGrams)} />
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/products/${product.slug}/edit`} className="font-medium text-accent hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} pageHref={pageHref} />
    </div>
  );
}
