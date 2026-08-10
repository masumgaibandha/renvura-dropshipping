import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { categories } from "@/data/categories";
import { brand } from "@/config/brand";
import { Container } from "./Container";

interface FooterLink {
  label: string;
  href: string;
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-label text-brand-gold uppercase">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-small text-brand-cream/70 transition-colors hover:text-brand-cream">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const shopLinks: FooterLink[] = [
  ...categories.filter((category) => !category.parentSlug).map((category) => ({ label: category.name, href: `/${category.slug}` })),
  { label: "All Products", href: "/shop" },
];

const customerServiceLinks: FooterLink[] = [
  { label: "Contact", href: "/contact" },
  { label: "Order Tracking", href: "/track-order" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "FAQ", href: "/faq" },
];

const informationLinks: FooterLink[] = [
  { label: "About", href: "/about" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

/** Payment methods actually accepted today — see note below about manual processing. */
const paymentMethods = ["Cash on Delivery", "bKash", "Nagad", "Rocket"];

function Divider(): ReactNode {
  return <span aria-hidden="true" className="h-1 w-1 rounded-full bg-brand-gold/60" />;
}

/**
 * Site footer. Deliberately dark/navy — the one place besides the
 * announcement bar that leans into the brand's dark treatment, and the
 * correct background for the dark logo lockup. See docs/DESIGN-SYSTEM.md.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-navy text-brand-cream">
      <Container>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-12 sm:py-16 md:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Image src={brand.assets.logo.dark} alt={brand.name} width={150} height={45} className="h-10 w-auto" />
            <p className="mt-4 max-w-xs text-small text-brand-cream/70">{brand.description}</p>
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Customer Service" links={customerServiceLinks} />
          <FooterColumn title="Information" links={informationLinks} />

          <div>
            <h3 className="text-label text-brand-gold uppercase">Payment</h3>
            <ul className="mt-4 space-y-2.5 text-small text-brand-cream/70">
              {paymentMethods.map((method) => (
                <li key={method}>{method}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-brand-cream/75">
              bKash, Nagad, and Rocket payments are currently received and verified manually — there is no automated
              payment gateway yet.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-brand-cream/15 py-6 text-xs text-brand-cream/75 sm:flex-row sm:justify-center">
          <span>
            © {year} {brand.name}. All rights reserved.
          </span>
          <Divider />
          <span>Made for Bangladesh</span>
        </div>
      </Container>
    </footer>
  );
}
