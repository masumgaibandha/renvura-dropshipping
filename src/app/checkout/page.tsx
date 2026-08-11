import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Checkout",
};

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }];

/**
 * Server Component shell — the cart itself is client-only state, so all
 * interactivity lives in `CheckoutForm`. Kept as a thin wrapper (rather
 * than folding this into the Client Component) so this route can carry its
 * own metadata export.
 */
export default function CheckoutPage() {
  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Checkout</h1>
      <CheckoutForm />
    </Container>
  );
}
