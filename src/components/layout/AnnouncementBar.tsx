import { IconTruck } from "@/components/ui/icons";
import { Container } from "./Container";

interface AnnouncementBarProps {
  /** Editable, neutral message — never a fabricated promotion/discount. */
  message?: string;
}

/**
 * Thin, persistent info strip above the header. Content is a prop so it
 * stays easy to change without touching layout — see docs/DESIGN-SYSTEM.md
 * for content rules (no invented offers/discounts).
 */
export function AnnouncementBar({ message = "Cash on Delivery Available Nationwide" }: AnnouncementBarProps) {
  return (
    <div className="bg-brand-navy text-brand-cream">
      <Container className="flex items-center justify-center gap-2 py-2">
        <IconTruck className="hidden size-4 shrink-0 text-brand-gold sm:block" />
        <p className="text-center text-label uppercase">{message}</p>
      </Container>
    </div>
  );
}
