import Link from "next/link";

import { brand, isConfigured } from "@/config/brand";
import { Container } from "./Container";

const hasCallToOrder = isConfigured(brand.contact.phone) || isConfigured(brand.contact.whatsapp);

/**
 * Thin utility strip above the header — reference layout: About/Contact on
 * the left, Call-to-order/Order Tracking/currency on the right. Purple
 * (`bg-accent`), not the dark ink surface used by the footer. The
 * "Call/WhatsApp to Order Now" segment only renders once a real number is
 * configured in brand.ts (currently TODO) — never a dead link to nowhere.
 * See docs/DESIGN-SYSTEM.md for content rules (no invented offers/contacts).
 */
export function AnnouncementBar() {
  return (
    <div className="bg-accent text-white">
      <Container className="flex h-9 items-center justify-between text-label">
        <nav aria-label="Utility" className="hidden items-center gap-4 sm:flex">
          <Link href="/about" className="transition-colors hover:text-white/80">
            About Us
          </Link>
          <Link href="/contact" className="transition-colors hover:text-white/80">
            Contact Us
          </Link>
        </nav>

        <p className="text-center sm:hidden">Cash on Delivery Available Nationwide</p>

        <div className="hidden items-center gap-4 sm:flex">
          {hasCallToOrder && (
            <a
              href={isConfigured(brand.contact.whatsapp) ? `https://wa.me/${brand.contact.whatsapp}` : `tel:${brand.contact.phone}`}
              className="transition-colors hover:text-white/80"
            >
              Call / WhatsApp to Order Now
            </a>
          )}
          <Link href="/track-order" className="transition-colors hover:text-white/80">
            Order Tracking
          </Link>
          <span className="text-white/80">
            {brand.currency.symbol} {brand.currency.code}
          </span>
        </div>
      </Container>
    </div>
  );
}
