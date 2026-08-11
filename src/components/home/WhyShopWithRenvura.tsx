import type { ComponentType, SVGProps } from "react";

import { IconCash, IconShieldCheck, IconTag, IconTruck } from "@/components/ui/icons";

interface TrustItem {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
}

/**
 * Only truthful, currently-real benefits — no "free delivery," "same-day,"
 * "guaranteed warranty," or "verified reviews" claims until an actual
 * policy backs them.
 */
const trustItems: TrustItem[] = [
  { Icon: IconCash, label: "Cash on Delivery", description: "Pay when your order arrives, no advance payment required." },
  { Icon: IconTruck, label: "Nationwide Delivery", description: "We deliver across Bangladesh, Dhaka and beyond." },
  { Icon: IconTag, label: "Selected Products", description: "A practical, hand-picked catalog rather than everything at once." },
  { Icon: IconShieldCheck, label: "Secure Ordering Experience", description: "A straightforward checkout with no hidden steps." },
];

/**
 * Compact trust section — reference layout: a simple icon-row grid between
 * Featured content and Brand Story. See docs/DESIGN-SYSTEM.md §9.
 */
export function WhyShopWithRenvura() {
  return (
    <div>
      <h2 className="text-h2 text-center text-foreground">Why Shop With Renvura</h2>
      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {trustItems.map(({ Icon, label, description }) => (
          <div key={label} className="flex flex-col items-center gap-2 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon className="size-5" />
            </span>
            <p className="text-small font-medium text-foreground">{label}</p>
            <p className="text-small text-foreground/70">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
