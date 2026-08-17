import type { ReactNode } from "react";

import type { Product } from "@/types/product";

interface ProductDetailsProps {
  product: Product;
  className?: string;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <h2 className="text-h3 text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/**
 * Description / Features / Specifications as plain stacked sections, not
 * tabs or an accordion — Phase 6 scopes Client Components to gallery/
 * quantity interactions only, and these need no interactivity to render.
 * Each section only renders if the product actually has that field — no
 * filler text for a section with nothing verified to say.
 */
export function ProductDetails({ product, className }: ProductDetailsProps) {
  const hasFeatures = product.features && product.features.length > 0;
  const hasSpecifications = product.specifications && product.specifications.length > 0;

  if (!product.description && !hasFeatures && !hasSpecifications) {
    return null;
  }

  return (
    <div className={className}>
      {product.description && (
        <DetailSection title="Description">
          <p className="max-w-prose text-body whitespace-pre-line text-foreground/70">{product.description}</p>
        </DetailSection>
      )}

      {hasFeatures && (
        <DetailSection title="Features">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {product.features!.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-small text-foreground/70">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-gold" />
                {feature}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {hasSpecifications && (
        <DetailSection title="Specifications">
          <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {product.specifications!.map((spec, index) => (
              <div
                key={spec.label}
                className={`grid grid-cols-2 gap-4 px-4 py-3 text-small ${index % 2 === 0 ? "bg-surface" : "bg-surface-soft"}`}
              >
                <dt className="text-foreground/70">{spec.label}</dt>
                <dd className="font-medium text-foreground">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </DetailSection>
      )}
    </div>
  );
}
