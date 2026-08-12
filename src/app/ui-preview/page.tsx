import { Button } from "@heroui/react";
import type { Metadata } from "next";

import { ProductCard } from "@/components/ecommerce/ProductCard";
import { Price } from "@/components/ecommerce/Price";
import { SaleBadge, StockBadge } from "@/components/ecommerce/Badges";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { getProductsByCategory } from "@/services/products";

/**
 * TEMPORARY internal route — not part of the public site. Exists only to
 * visually verify the Phase 3 design system (typography, buttons, badges,
 * price, product cards) against real Phase 2 data, since the real
 * homepage isn't built until Phase 4. Remove or gate this route before
 * production launch. See docs/DESIGN-SYSTEM.md.
 */
export const metadata: Metadata = {
  title: "UI Preview (Dev Only)",
  robots: { index: false, follow: false },
};

export default async function UiPreviewPage() {
  const [electronicsAll, beautyAll] = await Promise.all([
    getProductsByCategory("electronics-gadgets"),
    getProductsByCategory("health-beauty"),
  ]);
  const electronics = electronicsAll.slice(0, 4);
  const beauty = beautyAll.slice(0, 4);
  const sampleProducts = [...electronics, ...beauty];

  return (
    <>
      <Section className="pb-0!">
        <h1 className="text-h1 mb-4">Design System Preview</h1>
        <div className="rounded-2xl border border-border bg-background-secondary px-4 py-3 text-small text-foreground">
          <strong>Internal preview, not part of the public site.</strong> Verifies Phase 3 design-system components
          against real Phase 2 product data. Remove or gate this route before production launch.
        </div>
      </Section>

      <Section>
        <h2 className="text-h2 mb-6">Typography</h2>
        <div className="space-y-3">
          <p className="text-display">Display heading</p>
          <p className="text-h1">Heading 1</p>
          <p className="text-h2">Heading 2</p>
          <p className="text-h3">Heading 3</p>
          <p className="text-body max-w-prose">
            Body text — used for descriptions and general copy. Renvura is a premium Bangladesh-focused e-commerce
            store for electronics, gadgets, and health &amp; beauty products.
          </p>
          <p className="text-small text-foreground/70">Small text — used for meta info, captions, and helper copy.</p>
          <p className="text-price text-foreground">৳1,234.00 — price style</p>
          <p className="text-label text-foreground/70 uppercase">Label style</p>
        </div>
      </Section>

      <Section className="bg-background-secondary">
        <h2 className="text-h2 mb-6">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="danger-soft">Danger soft</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button isDisabled>Disabled</Button>
        </div>
      </Section>

      <Section>
        <h2 className="text-h2 mb-2">Badges</h2>
        <p className="mb-6 text-small text-foreground/70">
          Example values for visual reference only — not attached to a real product.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <StockBadge status="in_stock" />
          <StockBadge status="out_of_stock" />
          <SaleBadge discountPercentage={20} />
        </div>
      </Section>

      <Section className="bg-background-secondary">
        <h2 className="text-h2 mb-6">Price component</h2>
        <div className="flex flex-wrap gap-10">
          <div>
            <p className="text-label mb-2 text-foreground/70 uppercase">With discount (example)</p>
            <Price sellingPrice={799} regularPrice={999} />
          </div>
          <div>
            <p className="text-label mb-2 text-foreground/70 uppercase">Selling price only (example)</p>
            <Price sellingPrice={450} />
          </div>
          <div>
            <p className="text-label mb-2 text-foreground/70 uppercase">Not yet priced (real state)</p>
            <Price sellingPrice={null} />
          </div>
        </div>
      </Section>

      <Section>
        <h2 className="text-h2 mb-2">Product cards</h2>
        <p className="mb-6 text-small text-foreground/70">
          Real verified products from Phase 2 (src/data/products.ts) — {sampleProducts.length} shown as a sample.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sampleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-h2 mb-4">Containers &amp; spacing</h2>
        <p className="mb-4 text-small text-foreground/70">
          This whole page uses the shared <code className="font-mono">Container</code>/<code className="font-mono">Section</code>{" "}
          primitives — resize the window to check the container max-width and section rhythm at ~375px, ~768px, and
          ~1440px.
        </p>
        <Container className="rounded-lg border border-dashed border-border py-4 text-center text-small text-foreground/70">
          max-w-7xl container
        </Container>
      </Section>
    </>
  );
}
