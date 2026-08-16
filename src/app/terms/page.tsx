import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { brand, isConfigured } from "@/config/brand";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you place an order or use an account on Renvura.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/terms" } } : {}),
};

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Terms & Conditions" }];

/**
 * Describes only what this codebase actually does today — every claim here
 * traces to a real, implemented rule (see CLAUDE.md's "Checkout & order
 * rules", "Order operations & customer lifecycle", and "Courier /
 * fulfillment integration" sections). Deliberately does NOT invent a
 * registered legal entity name (`brand.legalName` is still pending real
 * business-registration input — see that field's own doc comment) or a
 * return/refund policy Renvura hasn't approved — the Returns & Refunds
 * section below states plainly that none exists yet rather than fabricate
 * one, matching the same stance already taken on `/faq`.
 */
export default function TermsPage() {
  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Terms &amp; Conditions</h1>
      <p className="mt-2 max-w-2xl text-body text-foreground/70">
        These terms apply whenever you browse, create an account, or place an order on Renvura. By placing an order, you
        agree to the terms on this page.
      </p>

      <div className="mt-10 flex max-w-3xl flex-col gap-8">
        <section>
          <h2 className="text-h3 text-foreground">Who We Are</h2>
          <p className="mt-3 text-body text-foreground/70">
            Renvura is an e-commerce store operating in Bangladesh, selling electronics, fashion, home &amp; lifestyle,
            health &amp; beauty, and other general merchandise. Renvura&apos;s full legal/registered business name is
            still pending and will be added here once available.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Placing an Order</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              You can order as a guest or with a Renvura account. Product prices shown at checkout, the delivery fee for
              your address, and your order total are recalculated by our systems at the moment you place the order — the
              price you pay is always what&apos;s confirmed on the order summary and confirmation page, not a price
              assumed from an earlier page view.
            </p>
            <p>
              <strong className="text-foreground">Accurate information is your responsibility.</strong> You must provide
              an accurate name, phone number, and delivery address (division, district, upazila/thana, and address line).
              An order that can&apos;t be delivered because the phone number is unreachable or the address is incomplete
              or incorrect may be cancelled — see &quot;Order Confirmation &amp; Cancellation&quot; below.
            </p>
            <p>
              Placing an order does not guarantee stock availability at the moment of confirmation — in the rare case an
              item becomes unavailable between checkout and confirmation, we will contact you before proceeding.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Order Confirmation &amp; Cancellation</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              Every new order starts as <strong className="text-foreground">Pending</strong>. Our team calls or messages
              you (by phone or WhatsApp, using the number provided at checkout) to confirm the order is genuine before it
              moves to fulfillment. An order only moves to <strong className="text-foreground">Confirmed</strong> after
              this check succeeds.
            </p>
            <p>
              An order may be cancelled — before or after confirmation — if it can&apos;t be verified (e.g. the phone is
              unreachable), the address is invalid, an item turns out to be unavailable, a payment issue can&apos;t be
              resolved, or you request cancellation yourself. If you&apos;d like to cancel an order, contact us as soon as
              possible — an order that has already been handed to a courier for delivery may not be cancellable.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Payment</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              <strong className="text-foreground">Cash on Delivery</strong> is available on every order — you pay when it
              arrives.
            </p>
            <p>
              <strong className="text-foreground">Manual bKash / Nagad / Rocket</strong> payment is available where shown
              at checkout. You send the payment yourself in your own mobile wallet app and enter the Transaction ID at
              checkout; our team verifies it manually. There is currently no automated payment gateway, and no card
              payment option.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Product Sourcing &amp; Fulfillment</h2>
          <p className="mt-3 text-body text-foreground/70">
            Some products are sourced from a third-party supplier and fulfilled under Renvura branding (a dropshipping
            model) rather than held as Renvura&apos;s own warehouse stock. Product photos, descriptions, and specifications
            are provided as accurately as possible; minor variation between the product photo and the item received can
            occasionally occur with dropshipped items, and if what arrives doesn&apos;t match what you ordered, contact us.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Delivery</h2>
          <p className="mt-3 text-body text-foreground/70">
            Renvura delivers nationwide across Bangladesh, using our own team and/or third-party courier partners. See our{" "}
            <Link href="/shipping-policy" className="font-medium text-accent hover:underline">
              Shipping &amp; Delivery Policy
            </Link>{" "}
            for delivery fees, timing, and courier details.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Returns &amp; Refunds</h2>
          <p className="mt-3 text-body text-foreground/70">
            Renvura does not yet have a published returns or refunds policy. If there&apos;s a problem with your order —
            it arrived damaged, the wrong item was sent, or it never arrived — please{" "}
            <Link href="/contact" className="font-medium text-accent hover:underline">
              contact us
            </Link>{" "}
            and we&apos;ll review it directly. This page will be updated with a formal policy once one is finalized.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Pricing &amp; Product Information</h2>
          <p className="mt-3 text-body text-foreground/70">
            We try to ensure prices, descriptions, and stock levels shown on the site are accurate, but errors can occur.
            If we discover a pricing or listing error on an order that hasn&apos;t yet been confirmed, we will contact you
            before proceeding rather than fulfill the order at an incorrect price.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Changes to These Terms</h2>
          <p className="mt-3 text-body text-foreground/70">
            As Renvura adds new features or policies (such as a returns policy, or an automated payment gateway), this
            page will be updated to describe them accurately.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Questions</h2>
          <p className="mt-3 text-body text-foreground/70">
            If you have questions about these terms, please{" "}
            <Link href="/contact" className="font-medium text-accent hover:underline">
              contact us
            </Link>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
