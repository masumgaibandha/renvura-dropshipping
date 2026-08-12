import Link from "next/link";

import { CategoryActiveToggle } from "@/components/admin/CategoryActiveToggle";
import { getAllCategories } from "@/services/products";

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();
  const nameBySlug = new Map(categories.map((category) => [category.slug, category.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Categories</h1>
          <p className="mt-1 text-small text-foreground/70">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p>
        </div>
        <Link href="/admin/categories/new" className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover">
          New Category
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-small">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/70">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Slug</th>
              <th className="p-3 font-medium">Parent</th>
              <th className="p-3 font-medium">Display Order</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.slug} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground">{category.name}</td>
                <td className="p-3 font-mono text-xs text-foreground/70">{category.slug}</td>
                <td className="p-3 text-foreground/70">{category.parentSlug ? (nameBySlug.get(category.parentSlug) ?? category.parentSlug) : "—"}</td>
                <td className="p-3 text-foreground/70">{category.displayOrder}</td>
                <td className="p-3">
                  <span className={category.isActive ? "text-green-700" : "text-foreground/50"}>{category.isActive ? "Active" : "Inactive"}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/categories/${category.slug}/edit`} className="font-medium text-accent hover:underline">
                      Edit
                    </Link>
                    <CategoryActiveToggle slug={category.slug} name={category.name} isActive={category.isActive} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
