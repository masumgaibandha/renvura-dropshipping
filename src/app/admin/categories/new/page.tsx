import Link from "next/link";

import { CategoryForm, type CategoryFormValues } from "@/components/admin/CategoryForm";
import { IconArrowLeft } from "@/components/ui/icons";
import { getAllCategories } from "@/services/products";

const EMPTY_VALUES: CategoryFormValues = { name: "", description: "", parentSlug: "", displayOrder: "0" };

export default async function AdminNewCategoryPage() {
  const categories = await getAllCategories();
  const topCategories = categories.filter((category) => !category.parentSlug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/categories" className="inline-flex items-center gap-1.5 text-small font-medium text-foreground/70 hover:text-foreground">
          <IconArrowLeft className="size-4" />
          Back to categories
        </Link>
        <h1 className="mt-2 text-h2 font-semibold text-foreground">New Category</h1>
      </div>

      <div className="max-w-lg rounded-xl border border-border bg-surface p-5">
        <CategoryForm mode="create" slug="" topCategories={topCategories} initialValues={EMPTY_VALUES} />
      </div>
    </div>
  );
}
