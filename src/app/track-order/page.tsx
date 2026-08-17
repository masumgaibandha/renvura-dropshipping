import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { TrackOrderForm } from "@/components/checkout/TrackOrderForm";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Track Order",
};

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Track Order" }];

/** The route the footer's "Order Tracking" link and the mobile nav drawer both point to. Server Component shell around the Client lookup form. */
export default function TrackOrderPage() {
  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Track Order</h1>
      <p className="mt-2 text-body text-foreground/70">Enter your order number and mobile number to check your order status.</p>
      <div className="mt-6">
        <TrackOrderForm />
      </div>
    </Container>
  );
}
