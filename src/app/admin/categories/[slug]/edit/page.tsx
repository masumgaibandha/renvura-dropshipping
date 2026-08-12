import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryForm, type CategoryFormValues } from "@/components/admin/CategoryForm";
import { IconArrowLeft } from "@/components/ui/icons";
import { getAllCategories } from "@/services/products";

export default async function AdminEditCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getAllCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const topCategories = categories.filter((item) => !item.parentSlug);
  const initialValues: CategoryFormValues = {
    name: category.name,
    description: category.description ?? "",
    parentSlug: category.parentSlug ?? "",
    displayOrder: String(category.displayOrder),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/categories" className="inline-flex items-center gap-1.5 text-small font-medium text-foreground/70 hover:text-foreground">
          <IconArrowLeft className="size-4" />
          Back to categories
        </Link>
        <h1 className="mt-2 text-h2 font-semibold text-foreground">{category.name}</h1>
      </div>

      <div className="max-w-lg rounded-xl border border-border bg-surface p-5">
        <CategoryForm mode="edit" slug={slug} topCategories={topCategories} initialValues={initialValues} />
      </div>
    </div>
  );
}
