/**
 * Shared main-navigation structure, used by both the desktop header and
 * the mobile drawer so link targets are defined in exactly one place.
 *
 * `href: null` on a top-level item with no `children` marks an item that
 * has no real destination yet (see "Offers" precedent) — components must
 * render those as inert, not as a link to a page that doesn't exist or a
 * fabricated promotion. `href: null` on an item *with* `children` instead
 * marks a pure dropdown/group trigger ("Categories") — never a link
 * itself, only a container for its children.
 *
 * Kept deliberately short at the top level (5 items) even though the
 * catalog now spans 8+ categories — "Categories" is the one dropdown that
 * absorbs the long tail, so the visible nav never grows into an
 * unscannable 10+-item row. Every child link points at `/shop?category=`,
 * the one route confirmed to resolve for both top-level categories and
 * subcategories (see CLAUDE.md's category-navigation note) — never a
 * `/${slug}` guess that only some categories have a dedicated route for.
 */

export interface NavChildItem {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string | null;
  /** Shown next to inert items so the UI never looks broken. Never set together with `children`. */
  comingSoon?: boolean;
  /** Present only on a dropdown/group trigger (e.g. "Categories") — the item itself is never a link when this is set. */
  children?: NavChildItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  {
    label: "Categories",
    href: null,
    children: [
      { label: "Electronics & Gadgets", href: "/shop?category=electronics-gadgets" },
      { label: "Health & Beauty", href: "/shop?category=health-beauty" },
      { label: "Fashion", href: "/shop?category=fashion" },
      { label: "Home & Lifestyle", href: "/shop?category=home-lifestyle" },
      { label: "Watches, Bags & Jewellery", href: "/shop?category=watches-bags-jewellery" },
      { label: "Mother & Baby", href: "/shop?category=mother-baby" },
      { label: "Sports & Outdoors", href: "/shop?category=sports-outdoors" },
      { label: "Automotive", href: "/shop?category=automotive" },
    ],
  },
  { label: "Electronics & Gadgets", href: "/electronics-gadgets" },
  { label: "Health & Beauty", href: "/health-beauty" },
];
