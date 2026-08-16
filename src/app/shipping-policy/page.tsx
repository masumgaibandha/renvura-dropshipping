import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { brand, isConfigured } from "@/config/brand";
import { getDeliveryFees } from "@/services/settings";
import { formatBDT } from "@/utils/currency";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: "How and where Renvura delivers, delivery fees, and what to expect after you place an order.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/shipping-policy" } } : {}),
};

/**
 * Reads live delivery fees from `StoreSettings` (not hardcoded) — same
 * reasoning as `/faq`, so this page can never drift from what checkout
 * actually charges once an admin edits fees at /admin/settings/delivery.
 * `adminUpdateStoreSettings` calls `revalidatePath` on the pages that need
 * it; this 60s ceiling is the fallback so a missed revalidation call still
 * self-corrects quickly.
 */
export const revalidate = 60;

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Shipping & Delivery Policy" }];

export default async function ShippingPolicyPage() {
  const fees = await getDeliveryFees();

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Shipping &amp; Delivery Policy</h1>
      <p className="mt-2 max-w-2xl text-body text-foreground/70">
        Where Renvura delivers, what it costs, and what to expect between placing an order and it arriving.
      </p>

      <div className="mt-10 flex max-w-3xl flex-col gap-8">
        <section>
          <h2 className="text-h3 text-foreground">Where We Deliver</h2>
          <p className="mt-3 text-body text-foreground/70">
            Renvura delivers nationwide across Bangladesh — inside Dhaka and to every other division, district, and
            upazila/thana in the country.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Delivery Fees</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              A flat delivery fee is added to your order total based on your delivery address: currently{" "}
              <strong className="text-foreground">{formatBDT(fees.insideDhaka)}</strong> for addresses inside Dhaka and{" "}
              <strong className="text-foreground">{formatBDT(fees.outsideDhaka)}</strong> for addresses outside Dhaka.
              These fees can change — the exact fee for your address is always shown on the checkout page and order
              summary before you place your order, and that figure is the authoritative one.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Delivery Time</h2>
          <p className="mt-3 text-body text-foreground/70">
            Renvura does not currently publish a fixed delivery-time guarantee. Delivery time varies by your location,
            product availability, and courier scheduling.{" "}
            <strong className="text-foreground">Any delivery estimate given to you (by phone, WhatsApp, or elsewhere) is
            an estimate, not a guarantee</strong> — unexpected delays (courier availability, weather, address issues) can
            occasionally occur.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">How Orders Are Fulfilled</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              Every new order starts as Pending. Our team contacts you by phone or WhatsApp, using the number you provided
              at checkout, to confirm the order is genuine before it&apos;s handed off for delivery — see our{" "}
              <Link href="/terms" className="font-medium text-accent hover:underline">
                Terms &amp; Conditions
              </Link>{" "}
              for the full order confirmation and cancellation process.
            </p>
            <p>
              Delivery is handled by our own team and/or third-party courier partners. Once your order ships, tracking
              details (courier name, tracking ID, and a tracking link where available) are shown on your order tracking
              page and, if you have an account, under My Account → Orders.
            </p>
            <p>
              Accurate delivery information matters — please make sure your phone number and address (division, district,
              upazila/thana, and address line) are correct at checkout. An order that can&apos;t be delivered because of
              an unreachable phone number or an incomplete/incorrect address may be delayed or cancelled.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Cash on Delivery</h2>
          <p className="mt-3 text-body text-foreground/70">
            If you chose Cash on Delivery, please have the order total (shown on your order confirmation) ready in cash
            when your order arrives.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">What Information Is Shared With a Courier</h2>
          <p className="mt-3 text-body text-foreground/70">
            To deliver your order, we share only what&apos;s needed for pickup and delivery — your name, phone number,
            delivery address, the items and total parcel weight, and the Cash on Delivery amount to collect (if
            applicable) — with the courier partner handling that delivery. See our{" "}
            <Link href="/privacy-policy" className="font-medium text-accent hover:underline">
              Privacy Policy
            </Link>{" "}
            for the full detail on what is and isn&apos;t shared.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">If Something Goes Wrong</h2>
          <p className="mt-3 text-body text-foreground/70">
            If your order hasn&apos;t arrived, arrived damaged, or something else looks wrong, please{" "}
            <Link href="/contact" className="font-medium text-accent hover:underline">
              contact us
            </Link>{" "}
            with your order number. Renvura does not yet have a published returns/refunds policy — see our{" "}
            <Link href="/terms" className="font-medium text-accent hover:underline">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Changes to This Policy</h2>
          <p className="mt-3 text-body text-foreground/70">
            As delivery fees, courier partners, or delivery-time information change, this page will be updated to
            describe them accurately.
          </p>
        </section>
      </div>
    </Container>
  );
}
