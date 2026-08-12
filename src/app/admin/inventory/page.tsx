import Link from "next/link";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { listProductsForAdmin } from "@/services/products";
import { getStoreSettings } from "@/services/settings";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const page = Number.parseInt(firstParam(params.page) ?? "1", 10) || 1;

  const [result, settings] = await Promise.all([listProductsForAdmin({ page, pageSize: 50 }), getStoreSettings()]);
  const products = [...result.products].sort((a, b) => {
    const stockA = a.inventory.stock ?? Number.POSITIVE_INFINITY;
    const stockB = b.inventory.stock ?? Number.POSITIVE_INFINITY;
    return stockA - stockB;
  });

  function pageHref(pageNumber: number): string {
    return pageNumber > 1 ? `/admin/inventory?page=${pageNumber}` : "/admin/inventory";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Inventory</h1>
        <p className="mt-1 text-small text-foreground/70">
          {result.total} product{result.total === 1 ? "" : "s"} · low-stock threshold: {settings.lowStockThreshold} units (
          <Link href="/admin/settings/delivery" className="text-accent hover:underline">
            change
          </Link>
          )
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-small">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/70">
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Current Stock</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-foreground/70">
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isLowStock = product.inventory.stock !== null && product.inventory.stock <= settings.lowStockThreshold;
                return (
                  <tr key={product.slug} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium text-foreground">{product.title}</td>
                    <td className="p-3 text-foreground/70">{product.sku ?? "—"}</td>
                    <td className="p-3">
                      <span className={isLowStock ? "font-semibold text-amber-600" : "text-foreground"}>{product.inventory.stock ?? "Unknown"}</span>
                      {isLowStock && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Low stock</span>}
                    </td>
                    <td className="p-3 text-foreground/70">{product.inventory.status.replace("_", " ")}</td>
                    <td className="p-3">
                      <StockAdjustForm slug={product.slug} currentStock={product.inventory.stock} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} pageHref={pageHref} />
    </div>
  );
}
