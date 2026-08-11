import type { Metadata } from "next";

import { ProductListingPage } from "@/components/shop/ProductListingPage";
import { isConfigured, brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Health & Beauty",
  description: "Health & beauty essentials from Renvura — skincare and personal care, delivered across Bangladesh with Cash on Delivery.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/health-beauty" } } : {}),
};

interface CategoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HealthBeautyPage({ searchParams }: CategoryPageProps) {
  return (
    <ProductListingPage
      categorySlug="health-beauty"
      title="Health & Beauty"
      description="Skincare and personal care essentials, from serums and sunscreen to everyday self-care."
      searchParams={searchParams}
    />
  );
}
