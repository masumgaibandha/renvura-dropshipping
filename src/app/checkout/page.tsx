import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { getCurrentUser } from "@/lib/auth-session";
import { getAddressesForUser } from "@/services/addresses";
import { getDeliveryFees } from "@/services/settings";

export const metadata: Metadata = {
  title: "Checkout",
};

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }];

/**
 * Server Component shell — the cart itself is client-only state, so most
 * interactivity lives in `CheckoutForm`. Now also fetches the current
 * session (if any) and, when signed in, saved addresses — both passed down
 * as optional props purely to prefill/offer shortcuts. Guest checkout is
 * unaffected: with no session, both props are omitted and `CheckoutForm`
 * renders exactly as it always has. Losing static generation here (this
 * page previously fetched nothing) has no real cost — checkout was never
 * a candidate for prerendering, unlike the homepage/listing pages.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const [savedAddresses, deliveryFees] = await Promise.all([
    user ? getAddressesForUser(user.id) : Promise.resolve([]),
    getDeliveryFees(),
  ]);

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Checkout</h1>
      <CheckoutForm
        initialCustomer={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : undefined}
        savedAddresses={savedAddresses}
        deliveryFees={deliveryFees}
      />
    </Container>
  );
}
