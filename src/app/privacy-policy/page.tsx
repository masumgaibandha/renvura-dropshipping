import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { brand, isConfigured } from "@/config/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Renvura collects, uses, and stores information when you shop or create an account.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/privacy-policy" } } : {}),
};

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Privacy Policy" }];

/**
 * Describes only what this codebase actually does today — every claim here
 * should be traceable to a real feature (Better Auth accounts, `Order`/
 * `Address` MongoDB collections, manual bKash/Nagad/Rocket verification,
 * cart/wishlist localStorage, Phase 11's Meta Pixel/Conversions API/GA4
 * measurement). Does not invent a registered legal entity name, retention
 * periods, or a formal compliance framework this project hasn't verified.
 */
export default function PrivacyPolicyPage() {
  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Privacy Policy</h1>
      <p className="mt-2 max-w-2xl text-body text-foreground/70">
        This page describes what information Renvura collects when you use this website, and how it&apos;s used. It covers
        the features that exist on this site today and will be updated as new features are added.
      </p>

      <div className="mt-10 flex max-w-3xl flex-col gap-8">
        <section>
          <h2 className="text-h3 text-foreground">Information We Collect</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              <strong className="text-foreground">Account information.</strong> If you create an account, we store your
              name, email address, a securely hashed version of your password (never stored in plain text), and phone
              number if you provide one.
            </p>
            <p>
              <strong className="text-foreground">Order information.</strong> Placing an order — as a guest or signed in —
              collects your name, phone number, delivery address (division, district, upazila/thana, and address line), and
              email address if you provide one. This information is used to fulfill and deliver your order.
            </p>
            <p>
              <strong className="text-foreground">Saved addresses.</strong> If you&apos;re signed in, addresses you choose to
              save are stored on your account so you don&apos;t need to re-enter them on future orders. You can add, edit, or
              delete saved addresses at any time from your account.
            </p>
            <p>
              <strong className="text-foreground">Payment information.</strong> For Cash on Delivery, no payment information
              is collected online at all. For manual bKash/Nagad/Rocket payments, we collect the Transaction ID you enter at
              checkout so we can verify the payment was received — we never collect your mobile wallet PIN, card numbers, or
              bank account details, since payment for these methods happens directly in your own bKash/Nagad/Rocket app, not
              on this site.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Cookies &amp; Sessions</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              When you sign in, we set a secure session cookie so you stay signed in as you browse. This cookie identifies
              your session, not your password. We also use a small cookie to remember your display preferences.
            </p>
            <p>
              Your shopping cart and wishlist are stored in your browser (not in a cookie, and not sent to our servers)
              until you check out — clearing your browser data will clear them.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Order Tracking</h2>
          <p className="mt-3 text-body text-foreground/70">
            The{" "}
            <Link href="/track-order" className="font-medium text-accent hover:underline">
              Track Order
            </Link>{" "}
            page looks up your order using your order number and the phone number used at checkout, so an order can be
            checked without needing to create an account.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Where Information Is Stored</h2>
          <p className="mt-3 text-body text-foreground/70">
            Account, order, and address information is stored in MongoDB Atlas, a cloud database. Access to this data is
            limited to what&apos;s needed to operate the store — for example, verifying a manual payment or showing your own
            order history to you.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Third-Party Analytics &amp; Advertising</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>
              This site uses Meta (Facebook/Instagram) Pixel and Conversions API, and Google Analytics 4, to measure how
              people use the store — for example, which product pages are viewed, what&apos;s searched for, what&apos;s
              added to a cart or wishlist, and when an order is successfully placed. This helps us understand what&apos;s
              working and, where relevant, measure the results of advertising.
            </p>
            <p>
              <strong className="text-foreground">Meta Pixel</strong> runs in your browser and sets cookies (such as{" "}
              <code className="rounded bg-surface-soft px-1 py-0.5 text-xs">_fbp</code> and, if you arrived from a Meta ad,{" "}
              <code className="rounded bg-surface-soft px-1 py-0.5 text-xs">_fbc</code>) to help Meta measure ad
              performance. <strong className="text-foreground">Meta Conversions API</strong> sends a matching copy of the
              same order-completion event directly from our server for orders that are successfully placed, so the event
              still reaches Meta even if a browser blocks the Pixel — Meta then treats the two as a single event rather
              than counting it twice. When we send this server-side event, we include your email address and/or phone
              number only in cryptographically hashed (SHA-256) form — never in plain text — plus your browser&apos;s IP
              address and user agent. We never send your delivery address, payment details (including bKash/Nagad/Rocket
              Transaction IDs), or Renvura&apos;s own product costs to Meta or Google.
            </p>
            <p>
              <strong className="text-foreground">Google Analytics 4</strong> similarly runs in your browser to measure page
              views and store activity. We do not send your name, email, phone number, or delivery address to Google
              Analytics.
            </p>
            <p>
              This measurement currently runs for every visitor — this site does not yet show a cookie-consent banner. If
              that changes, this page and the site&apos;s behavior will be updated accordingly. If analytics isn&apos;t
              configured (for example, while a feature is still being built or tested), none of this runs.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Your Choices</h2>
          <div className="mt-3 space-y-3 text-body text-foreground/70">
            <p>You can check out as a guest without creating an account.</p>
            <p>
              If you have an account, you can update your name and phone number, and add, edit, or delete saved addresses,
              from{" "}
              <Link href="/account" className="font-medium text-accent hover:underline">
                My Account
              </Link>
              .
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Changes to This Policy</h2>
          <p className="mt-3 text-body text-foreground/70">
            As Renvura adds new features, this page will be updated to describe them accurately. We won&apos;t start using
            third-party tracking without updating this page first.
          </p>
        </section>

        <section>
          <h2 className="text-h3 text-foreground">Questions</h2>
          <p className="mt-3 text-body text-foreground/70">
            If you have questions about this policy, please{" "}
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
