"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { adminCreateCategory, adminUpdateCategory } from "@/actions/admin/categories";

export interface CategoryFormValues {
  name: string;
  description: string;
  parentSlug: string;
  displayOrder: string;
}

interface CategoryFormProps {
  mode: "create" | "edit";
  slug: string;
  topCategories: { slug: string; name: string }[];
  initialValues: CategoryFormValues;
}

export function CategoryForm({ mode, slug, topCategories, initialValues }: CategoryFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [slugInput, setSlugInput] = useState(mode === "create" ? "" : slug);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const displayOrder = Number(values.displayOrder || "0");
    if (!Number.isInteger(displayOrder)) {
      setError("Display order must be a whole number.");
      return;
    }

    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      parentSlug: values.parentSlug || null,
      displayOrder,
    };

    startTransition(async () => {
      const result = mode === "create" ? await adminCreateCategory(slugInput.trim(), payload) : await adminUpdateCategory(slug, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (mode === "create") {
        router.push("/admin/categories");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === "create" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/70">Slug</span>
          <input
            value={slugInput}
            onChange={(event) => setSlugInput(event.target.value)}
            placeholder="e.g. smart-home"
            required
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/70">Name</span>
        <input value={values.name} onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))} required className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/70">Description</span>
        <textarea value={values.description} onChange={(event) => setValues((v) => ({ ...v, description: event.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background p-3 text-small text-foreground" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/70">Parent category</span>
        <select
          value={values.parentSlug}
          onChange={(event) => setValues((v) => ({ ...v, parentSlug: event.target.value }))}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-small text-foreground"
        >
          <option value="">None — top-level category</option>
          {topCategories
            .filter((category) => category.slug !== slug)
            .map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/70">Display order</span>
        <input value={values.displayOrder} onChange={(event) => setValues((v) => ({ ...v, displayOrder: event.target.value }))} inputMode="numeric" className="h-9 w-40 rounded-lg border border-border bg-background px-3 text-small text-foreground" />
      </label>

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
          {isPending ? "Saving…" : mode === "create" ? "Create Category" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
