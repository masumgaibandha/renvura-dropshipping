import type { MetadataRoute } from "next";

import { brand, isConfigured } from "@/config/brand";
import { getAllProducts } from "@/services/products";

/**
 * Generated `sitemap.xml`. Only ever emits URLs that are (a) genuinely
 * public and (b) each page's own `alternates.canonical` already points at
 * — deliberately excludes `/shop?category=<slug>` query-string variants,
 * since `/shop` itself always canonicalizes to plain `/shop` (see
 * `src/app/shop/page.tsx`); listing a URL here that a page's own metadata
 * disowns as non-canonical is exactly the "misleading/duplicate URL" this
 * file must avoid. `/electronics-gadgets` and `/health-beauty` are
 * included because they're real routes that canonicalize to themselves.
 * Product entries are limited to `status === "active"` — a draft/
 * unpublished product (see CLAUDE.md's `skin1004-centella-ampoule-100ml`
 * note) has no real page to sell from and shouldn't be advertised for
 * indexing. Returns an empty sitemap (not a broken one) until a real
 * production URL is configured, matching `robots.ts`'s own gate.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isConfigured(brand.urls.site)) return [];

  const siteUrl = brand.urls.site;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/electronics-gadgets`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/health-beauty`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/track-order`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/shipping-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const allProducts = await getAllProducts();
  const productRoutes: MetadataRoute.Sitemap = allProducts
    .filter((product) => product.status === "active")
    .map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...productRoutes];
}
