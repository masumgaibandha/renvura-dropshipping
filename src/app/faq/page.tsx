import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { brand, isConfigured } from "@/config/brand";
import { getDeliveryFees } from "@/services/settings";
import { formatBDT } from "@/utils/currency";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about delivery, payment, and your Renvura account.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/faq" } } : {}),
};

/**
 * This page reads live delivery fees from `StoreSettings`, so without a
 * revalidation window it would otherwise be baked once at build time and
 * never reflect an admin's later change at /admin/settings/delivery — same
 * reasoning as the homepage's `revalidate = 60`. `adminUpdateStoreSettings`
 * (`src/actions/admin/settings.ts`) also calls `revalidatePath("/faq")` for
 * near-instant updates; this is the fallback ceiling.
 */
export const revalidate = 60;

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "FAQ" }];

interface FaqItem {
  question: string;
  answer: ReactNode;
}

/**
 * Only questions this app can answer truthfully today — no return/refund
 * policy (none is defined yet), no delivery-time estimates (none is
 * approved), nothing about a payment gateway (none exists). Delivery fees
 * are read live from `StoreSettings` (not hardcoded) so this page can never
 * drift from what checkout actually charges once an admin edits them at
 * /admin/settings/delivery.
 */
async function getFaqItems(): Promise<FaqItem[]> {
  const fees = await getDeliveryFees();

  return [
    {
      question: "Do you deliver inside and outside Dhaka?",
      answer: (
        <>
          Yes. Delivery is available nationwide. The delivery fee is {formatBDT(fees.insideDhaka)} inside Dhaka and{" "}
          {formatBDT(fees.outsideDhaka)} outside Dhaka, added to your order total at checkout. Delivery may be handled by a
          third-party courier partner — see our{" "}
          <Link href="/privacy-policy" className="font-medium text-accent hover:underline">
            Privacy Policy
          </Link>{" "}
          for what delivery information is shared with them.
        </>
      ),
    },
    {
      question: "Can I pay Cash on Delivery?",
      answer: "Yes. Cash on Delivery is available on every order — you pay when it arrives, with no advance payment required.",
    },
    {
      question: "Can I pay with bKash, Nagad, or Rocket?",
      answer:
        "Yes, where configured at checkout. These are manual payments: you send the payment yourself and enter the Transaction ID during checkout, and our team verifies it — there is no automated payment gateway yet.",
    },
    {
      question: "How do I track my order?",
      answer: (
        <>
          Use{" "}
          <Link href="/track-order" className="font-medium text-accent hover:underline">
            Track Order
          </Link>{" "}
          with your order number and the phone number used at checkout. If you&apos;re signed in, your order history is also
          available under{" "}
          <Link href="/account/orders" className="font-medium text-accent hover:underline">
            My Account → Orders
          </Link>
          .
        </>
      ),
    },
    {
      question: "Do I need an account to order?",
      answer: (
        <>
          No — guest checkout is available. Creating a free account lets you save delivery addresses and view your order
          history in one place. You can{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            sign up
          </Link>{" "}
          at any time.
        </>
      ),
    },
  ];
}

export default async function FaqPage() {
  const faqItems = await getFaqItems();

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Frequently Asked Questions</h1>
      <p className="mt-2 max-w-2xl text-body text-foreground/70">
        Common questions about delivery, payment, and your account. Still need help?{" "}
        <Link href="/contact" className="font-medium text-accent hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="mt-8 flex max-w-3xl flex-col gap-3">
        {faqItems.map((item) => (
          <details key={item.question} className="group rounded-2xl border border-border bg-surface p-5 open:pb-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-foreground marker:content-none">
              {item.question}
              <span aria-hidden="true" className="shrink-0 text-foreground/50 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-small text-foreground/70">{item.answer}</p>
          </details>
        ))}
      </div>
    </Container>
  );
}
