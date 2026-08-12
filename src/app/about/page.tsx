import type { Metadata } from "next";
import Link from "next/link";

import { BrandStory } from "@/components/home/BrandStory";
import { WhyShopWithRenvura } from "@/components/home/WhyShopWithRenvura";
import { Section } from "@/components/layout/Section";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { brand, isConfigured } from "@/config/brand";

export const metadata: Metadata = {
  title: "About Us",
  description: brand.description,
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/about" } } : {}),
};

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "About Us" }];

/**
 * Reuses the homepage's already-vetted `BrandStory`/`WhyShopWithRenvura`
 * copy rather than writing new marketing claims — both were deliberately
 * written with "no invented history, customer counts, or market-leadership
 * claims" (see BrandStory.tsx's own doc comment), which is exactly the bar
 * an About page needs to clear too.
 */
export default function AboutPage() {
  return (
    <>
      <Section className="pb-0!">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />
        <h1 className="text-h1 text-foreground">About Renvura</h1>
        <p className="mt-2 max-w-2xl text-body text-foreground/70">{brand.description}</p>
      </Section>

      <Section>
        <BrandStory />
      </Section>

      <Section className="bg-background-secondary">
        <h2 className="text-h2 text-center text-foreground">What We Sell</h2>
        <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
          <Link
            href="/electronics-gadgets"
            className="rounded-2xl border border-border bg-surface p-6 text-center text-body font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Electronics &amp; Gadgets
          </Link>
          <Link
            href="/health-beauty"
            className="rounded-2xl border border-border bg-surface p-6 text-center text-body font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Health &amp; Beauty
          </Link>
        </div>
      </Section>

      <Section>
        <WhyShopWithRenvura />
      </Section>
    </>
  );
}
