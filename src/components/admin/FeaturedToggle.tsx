"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { adminSetFeatured } from "@/actions/admin/products";

export function FeaturedToggle({ slug, featured }: { slug: string; featured: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-small text-foreground">
      <input
        type="checkbox"
        checked={featured}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(async () => {
            await adminSetFeatured(slug, next);
            router.refresh();
          });
        }}
        className="size-4"
      />
      Featured
    </label>
  );
}
