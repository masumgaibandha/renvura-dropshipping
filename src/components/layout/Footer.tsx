import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";

import { brand } from "@/config/brand";
import { Container } from "./Container";

interface FooterLink {
  label: string;
  href: string;
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-label text-white/90 uppercase">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-small text-white/65 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Categories" and "New Arrivals" both point at the same /shop scaffold as
 * "All Products" for now — Phase 5 (category pages) hasn't built a
 * dedicated categories index or new-arrivals view yet, so there's nowhere
 * more specific to send them without inventing a route.
 */
const shopLinks: FooterLink[] = [
  { label: "All Products", href: "/shop" },
  { label: "Categories", href: "/shop" },
  { label: "New Arrivals", href: "/shop" },
];

const informationLinks: FooterLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Order Tracking", href: "/track-order" },
  { label: "FAQ", href: "/faq" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Shipping & Delivery", href: "/shipping-policy" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

/** Payment methods actually accepted today — see CLAUDE.md's "Checkout & order rules" for the manual-verification detail this line deliberately doesn't spell out; the bottom bar is not the place for that level of process detail. */
const paymentMethods = "Cash on Delivery · bKash · Nagad · Rocket";

/**
 * Site footer. Deliberately dark — the one place besides the hero's dark
 * slides that leans into a dark treatment, and the correct background for
 * the dark logo lockup. Phase 25 redesign: premium/minimal pass — see
 * CLAUDE.md's footer-redesign brief. Removed entirely: the non-functional
 * newsletter form (no subscription backend ever existed behind it — see
 * git history for `NewsletterSignup.tsx`, deleted), the social icon row
 * (every `brand.social.*` value is still unconfigured today, so it never
 * rendered anything anyway — the config itself is untouched, so it can
 * come back the moment a real account exists), and the payment section's
 * explanatory sentence (the fact itself — manual verification, no gateway
 * — belongs in policy pages, not repeated in the global footer). The
 * "Contact" column only ever renders when a real email is configured
 * (`CONTACT_EMAIL_TO`, the same server-only source `/contact` already
 * uses) — no placeholder, no fabricated phone/WhatsApp/address, and the
 * grid itself drops to 3 columns rather than leaving an empty one when
 * that email isn't set. See docs/DESIGN-SYSTEM.md.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const contactEmail = process.env.CONTACT_EMAIL_TO;

  return (
    <footer className="bg-ink text-white">
      <Container>
        <div className={clsx("grid grid-cols-1 gap-x-10 gap-y-10 py-14 sm:grid-cols-2 lg:py-20", contactEmail ? "md:grid-cols-4" : "md:grid-cols-3")}>
          <div className="sm:col-span-2 md:col-span-1">
            <Image src={brand.assets.logo.dark} alt={brand.name} width={1000} height={300} className="h-9 w-auto" />
            <p className="mt-4 max-w-xs text-small text-white/65">
              Electronics, fashion, and lifestyle essentials — delivered across Bangladesh with Cash on Delivery.
            </p>
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Information" links={informationLinks} />

          {contactEmail && (
            <div>
              <h3 className="text-label text-white/90 uppercase">Contact</h3>
              <a href={`mailto:${contactEmail}`} className="mt-4 block text-small text-white/65 transition-colors hover:text-white">
                {contactEmail}
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>
            © {year} {brand.name}. All rights reserved.
          </p>
          <p>{paymentMethods}</p>
        </div>
      </Container>
    </footer>
  );
}
