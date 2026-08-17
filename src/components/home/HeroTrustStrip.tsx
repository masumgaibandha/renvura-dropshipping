import { IconCash, IconShieldCheck, IconTruck } from "@/components/ui/icons";

const items = [
  { Icon: IconCash, label: "Cash on Delivery" },
  { Icon: IconTruck, label: "Nationwide Delivery" },
  { Icon: IconShieldCheck, label: "Secure Checkout" },
];

/**
 * Compact one-line trust signal directly beneath the hero — same truthful
 * claims `WhyShopWithRenvura` covers in full further down the page, just
 * surfaced immediately so the top of the homepage isn't a large empty gap
 * between the hero image and the first product section. Deliberately not
 * DOM text baked into the hero image itself (see HeroBanner.tsx's doc
 * comment on why that stays a single flat image).
 */
export function HeroTrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-b border-border pb-8">
      {items.map(({ Icon, label }) => (
        <span key={label} className="flex items-center gap-2 text-small font-medium text-foreground/70">
          <Icon className="size-4 shrink-0 text-accent" />
          {label}
        </span>
      ))}
    </div>
  );
}
