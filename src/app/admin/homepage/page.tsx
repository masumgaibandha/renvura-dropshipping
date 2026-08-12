import Image from "next/image";

import { CategoryOrderForm } from "@/components/admin/CategoryOrderForm";
import { FeaturedToggle } from "@/components/admin/FeaturedToggle";
import { getAllCategories, getAllProducts } from "@/services/products";

export default async function AdminHomepagePage() {
  const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()]);
  const activeProducts = products.filter((product) => product.status === "active");
  const featuredCount = activeProducts.filter((product) => product.featured).length;
  const topCategories = categories.filter((category) => !category.parentSlug).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Homepage</h1>
        <p className="mt-1 text-small text-foreground/70">
          Choose which active products appear in the homepage&apos;s Featured Picks row, and the order category highlights appear in.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-semibold text-foreground">Featured Products</h2>
          <span className="text-xs text-foreground/70">
            {featuredCount === 0
              ? "None marked — homepage currently falls back to a default slice of the catalog"
              : `${featuredCount} product${featuredCount === 1 ? "" : "s"} marked`}
          </span>
        </div>
        {activeProducts.length === 0 ? (
          <p className="mt-4 text-small text-foreground/70">No active products yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {activeProducts.map((product) => (
              <li key={product.slug} className="flex items-center gap-3 py-2.5">
                {product.media.thumbnail ? (
                  <Image src={product.media.thumbnail} alt="" width={36} height={36} className="size-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="size-9 shrink-0 rounded-md bg-background-secondary" />
                )}
                <span className="min-w-0 flex-1 truncate text-small text-foreground">{product.title}</span>
                <FeaturedToggle slug={product.slug} featured={product.featured ?? false} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-body font-semibold text-foreground">Category Highlight Order</h2>
        <p className="mt-1 text-xs text-foreground/70">Lower numbers appear first.</p>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {topCategories.map((category) => (
            <li key={category.slug} className="flex items-center justify-between gap-3 py-2.5 text-small">
              <span className="text-foreground">{category.name}</span>
              <CategoryOrderForm slug={category.slug} name={category.name} description={category.description ?? null} parentSlug={category.parentSlug ?? null} displayOrder={category.displayOrder} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
