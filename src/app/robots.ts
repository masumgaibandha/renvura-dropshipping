import type { MetadataRoute } from "next";

import { brand, isConfigured } from "@/config/brand";

/**
 * Generated `robots.txt` — allows normal public storefront crawling and
 * blocks every private/auth/checkout/admin/internal surface. `sitemap`
 * is only emitted once a real production URL exists (`isConfigured`,
 * same gate `metadataBase` uses in the root layout) — a robots.txt that
 * pointed a crawler at `http://localhost:3000/sitemap.xml` would be
 * actively wrong, not just incomplete.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/account",
        "/account/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/checkout",
        "/order-success",
        "/order-success/",
        "/cart",
        "/wishlist",
        "/api/",
        "/ui-preview",
      ],
    },
    ...(isConfigured(brand.urls.site) ? { sitemap: `${brand.urls.site}/sitemap.xml` } : {}),
  };
}
