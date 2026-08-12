import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { IconPackage } from "@/components/ui/icons";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { brand, isConfigured } from "@/config/brand";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Renvura for order questions, product questions, or general support.",
  ...(isConfigured(brand.urls.site) ? { alternates: { canonical: "/contact" } } : {}),
};

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Contact Us" }];

/**
 * Contact channels only — no submission form. There's no email-sending
 * service wired into this codebase (no Resend/SendGrid/SMTP dependency, no
 * Server Action for it), so a form that appeared to "send" a message would
 * either silently do nothing or need fake success text — both are exactly
 * the kind of fabricated behavior CLAUDE.md rules out. `CONTACT_EMAIL_TO`
 * (server-only env var, not a secret — just the support inbox address) is
 * read directly here rather than added to `brand.contact.email`, since
 * `brand.ts` is also imported by a Client Component (MobileNav) and a
 * non-`NEXT_PUBLIC_` env var would silently resolve to `undefined` there.
 */
export default function ContactPage() {
  const supportEmail = process.env.CONTACT_EMAIL_TO ?? null;
  const hasPhone = isConfigured(brand.contact.phone);
  const hasWhatsapp = isConfigured(brand.contact.whatsapp);

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Contact Us</h1>
      <p className="mt-2 max-w-2xl text-body text-foreground/70">
        Have a question about an order or a product? Reach out below, or use one of the self-service options if that&apos;s
        quicker.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-h3 text-foreground">Email</h2>
          {supportEmail ? (
            <p className="mt-2 text-body text-foreground/70">
              <a href={`mailto:${supportEmail}`} className="font-medium text-accent hover:underline">
                {supportEmail}
              </a>
            </p>
          ) : (
            <p className="mt-2 text-small text-foreground/70">Email support isn&apos;t configured yet.</p>
          )}

          {(hasPhone || hasWhatsapp) && (
            <div className="mt-4 space-y-1 border-t border-border pt-4">
              {hasPhone && (
                <p className="text-small text-foreground/70">
                  Phone:{" "}
                  <a href={`tel:${brand.contact.phone}`} className="font-medium text-accent hover:underline">
                    {brand.contact.phone}
                  </a>
                </p>
              )}
              {hasWhatsapp && (
                <p className="text-small text-foreground/70">
                  WhatsApp:{" "}
                  <a href={`https://wa.me/${brand.contact.whatsapp}`} className="font-medium text-accent hover:underline">
                    {brand.contact.whatsapp}
                  </a>
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-h3 text-foreground">Already Have a Question About an Order?</h2>
          <ul className="mt-3 flex flex-col gap-3 text-small">
            <li>
              <Link href="/track-order" className="flex items-center gap-2 font-medium text-accent hover:underline">
                <IconPackage className="size-4" />
                Track your order
              </Link>
              <p className="mt-1 text-foreground/70">Look up order status with your order number and phone number.</p>
            </li>
            <li>
              <Link href="/faq" className="font-medium text-accent hover:underline">
                Read the FAQ
              </Link>
              <p className="mt-1 text-foreground/70">Delivery, payment, and account questions answered directly.</p>
            </li>
          </ul>
        </section>
      </div>
    </Container>
  );
}
