"use client";

import { adminSetCategoryActive } from "@/actions/admin/categories";
import { ConfirmActionButton } from "./ConfirmActionButton";

/** Client-side closure wrapper — see `PaymentVerificationActions.tsx`'s doc comment for why a Server Component can't pass this closure directly as a prop. */
export function CategoryActiveToggle({ slug, name, isActive }: { slug: string; name: string; isActive: boolean }) {
  return (
    <ConfirmActionButton
      label={isActive ? "Deactivate" : "Activate"}
      confirmTitle={isActive ? "Deactivate this category?" : "Activate this category?"}
      confirmDescription={
        isActive
          ? `"${name}" will be hidden from storefront navigation and filters. Existing products keep their category reference.`
          : `"${name}" will reappear in storefront navigation and filters.`
      }
      confirmLabel={isActive ? "Deactivate" : "Activate"}
      variant={isActive ? "danger" : "primary"}
      size="sm"
      onConfirm={() => adminSetCategoryActive(slug, !isActive)}
    />
  );
}
