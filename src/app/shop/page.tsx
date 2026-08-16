import type { Metadata } from "next";

import { ProductListingPage } from "@/components/shop/ProductListingPage";
import { isConfigured, brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse all Renvura products — electronics, fashion, home & lifestyle, health & beauty, and more, with Cash on Delivery nationwide.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/shop" } } : {}),
};

interface ShopPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  return (
    <ProductListingPage
      title="Shop"
      description="Every product currently in the Renvura catalog — electronics, fashion, home & lifestyle, health & beauty, and more."
      searchParams={searchParams}
    />
  );
}
