import type { Metadata } from "next";

import { ProductListingPage } from "@/components/shop/ProductListingPage";
import { isConfigured, brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Electronics & Gadgets",
  description: "Practical electronics and gadgets from Renvura — everyday tech, delivered across Bangladesh with Cash on Delivery.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/electronics-gadgets" } } : {}),
};

interface CategoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ElectronicsGadgetsPage({ searchParams }: CategoryPageProps) {
  return (
    <ProductListingPage
      categorySlug="electronics-gadgets"
      title="Electronics & Gadgets"
      description="Practical electronics and gadgets for everyday use — from portable fans to phone and camera accessories."
      searchParams={searchParams}
    />
  );
}
