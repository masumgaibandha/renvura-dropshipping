import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { brand, isConfigured } from "@/config/brand";
import { IconFacebook, IconInstagram, IconTiktok, IconYoutube } from "@/components/ui/icons";
import { Container } from "./Container";
import { NewsletterSignup } from "./NewsletterSignup";

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
            <Link href={link.href} className="text-small text-white/70 transition-colors hover:text-white">
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
  { label: "Contact Us", href: "/contact" },
  { label: "About Us", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

const socialLinks = [
  { key: "facebook", href: brand.social.facebook, Icon: IconFacebook, label: "Facebook" },
  { key: "instagram", href: brand.social.instagram, Icon: IconInstagram, label: "Instagram" },
  { key: "tiktok", href: brand.social.tiktok, Icon: IconTiktok, label: "TikTok" },
  { key: "youtube", href: brand.social.youtube, Icon: IconYoutube, label: "YouTube" },
].filter((social) => isConfigured(social.href));

const contactCandidates: ({ label: string; href: string } | null)[] = [
  isConfigured(brand.contact.phone) ? { label: brand.contact.phone, href: `tel:${brand.contact.phone}` } : null,
  isConfigured(brand.contact.email) ? { label: brand.contact.email, href: `mailto:${brand.contact.email}` } : null,
];
const contactItems = contactCandidates.filter((item): item is { label: string; href: string } => item !== null);

/** Payment methods actually accepted today — see note below about manual processing. */
const paymentMethods = ["Cash on Delivery", "bKash", "Nagad", "Rocket"];

function Divider(): ReactNode {
  return <span aria-hidden="true" className="h-1 w-1 rounded-full bg-brand-gold/60" />;
}

/**
 * Site footer. Deliberately dark — the one place besides the announcement
 * bar that leans into a dark treatment, and the correct background for the
 * dark logo lockup. See docs/DESIGN-SYSTEM.md.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white">
      <Container>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-12 sm:py-16 md:grid-cols-4">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Image src={brand.assets.logo.dark} alt={brand.name} width={150} height={45} className="h-10 w-auto" />
            <p className="mt-4 max-w-xs text-small text-white/70">{brand.description}</p>
            {socialLinks.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                {socialLinks.map(({ key, href, Icon, label }) => (
                  <a
                    key={key}
                    href={href}
                    aria-label={label}
                    className="inline-flex size-9 items-center justify-center rounded-full bg-ink-secondary text-white/80 transition-colors hover:text-white"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Information" links={informationLinks} />

          <div>
            <h3 className="text-label text-white/90 uppercase">Get in touch</h3>
            <ul className="mt-4 space-y-2.5 text-small text-white/70">
              {contactItems.length > 0 ? (
                contactItems.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="transition-colors hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))
              ) : (
                <li>
                  <Link href="/contact" className="transition-colors hover:text-white">
                    Contact Us
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 py-8">
          <h3 className="text-h3">Stay in the loop</h3>
          <p className="mt-1 mb-4 text-small text-white/70">New drops, offers, and stories — once a month.</p>
          <NewsletterSignup />
        </div>

        <div className="border-t border-white/15 py-6">
          <h3 className="text-label text-white/90 uppercase">We accept</h3>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-small text-white/70">
            {paymentMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/75">
            bKash, Nagad, and Rocket payments are currently received and verified manually — there is no automated
            payment gateway yet.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-white/15 py-6 text-xs text-white/75 sm:flex-row sm:justify-center">
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
