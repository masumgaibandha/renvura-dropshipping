/**
 * Shared main-navigation structure, used by both the desktop header and
 * the mobile drawer so link targets are defined in exactly one place.
 *
 * `href: null` marks an item that has no real destination yet (see
 * "Offers" below) — components must render those as inert, not as a
 * link to a page that doesn't exist or a fabricated promotion.
 */

export interface NavItem {
  label: string;
  href: string | null;
  /** Shown next to inert items so the UI never looks broken. */
  comingSoon?: boolean;
}

export const mainNavItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Electronics & Gadgets", href: "/electronics-gadgets" },
  { label: "Health & Beauty", href: "/health-beauty" },
  { label: "Shop", href: "/shop" },
  { label: "Offers", href: null, comingSoon: true },
];
