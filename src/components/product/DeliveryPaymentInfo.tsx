import { IconCash, IconTruck } from "@/components/ui/icons";

interface DeliveryPaymentInfoProps {
  className?: string;
}

const items = [
  { Icon: IconTruck, label: "Cash on Delivery available", description: "Pay when your order arrives." },
  { Icon: IconTruck, label: "Nationwide delivery", description: "We deliver across Bangladesh, Dhaka and beyond." },
  { Icon: IconCash, label: "Manual bKash / Nagad / Rocket", description: "Mobile-wallet payments are received and verified manually." },
];

/**
 * Compact, truthful delivery/payment block — no free/same-day/guaranteed
 * claims, no payment-gateway integration implied. Same information already
 * established in Footer.tsx's payment section, restated here compactly
 * near the point of purchase decision.
 */
export function DeliveryPaymentInfo({ className }: DeliveryPaymentInfoProps) {
  return (
    <div className={`space-y-3 rounded-2xl border border-border bg-surface-soft p-4 ${className ?? ""}`}>
      {items.map(({ Icon, label, description }) => (
        <div key={label} className="flex items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-accent" />
          <div>
            <p className="text-small font-medium text-foreground">{label}</p>
            <p className="text-xs text-foreground/70">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
