import Link from "next/link";

import { IconCash, IconTruck } from "@/components/ui/icons";

/**
 * Full-width promotional strip between "Popular Products" and "Featured
 * Picks" — pure visual-hierarchy breathing room between two product grids,
 * per the Phase 24 redesign's homepage structure. Copy restates only
 * already-approved, truthful facts (Cash on Delivery, nationwide delivery —
 * the same claims `WhyShopWithRenvura`/`DeliveryPaymentInfo` already make),
 * never a discount, scarcity, or sales claim with no data behind it.
 */
export function PromoBanner() {
  return (
    <div className="overflow-hidden rounded-2xl bg-accent">
      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:flex-row sm:justify-between sm:px-10 sm:text-left md:py-10">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
          <span className="flex items-center gap-2 text-small font-medium text-white/90">
            <IconCash className="size-5 shrink-0 text-accent-gold" />
            Cash on Delivery
          </span>
          <span className="hidden h-5 w-px bg-white/20 sm:block" aria-hidden="true" />
          <span className="flex items-center gap-2 text-small font-medium text-white/90">
            <IconTruck className="size-5 shrink-0 text-accent-gold" />
            Delivered Nationwide
          </span>
        </div>

        <Link
          href="/shop"
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-white px-6 text-small font-semibold text-ink transition-colors hover:bg-accent-gold"
        >
          Start Shopping
        </Link>
      </div>
    </div>
  );
}
