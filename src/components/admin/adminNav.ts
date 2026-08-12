import {
  IconBarChart,
  IconBox,
  IconCash,
  IconGrid,
  IconHome,
  IconLayers,
  IconPackage,
  IconSettings,
  IconTag,
  IconUser,
} from "@/components/ui/icons";

export const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: IconGrid },
  { label: "Orders", href: "/admin/orders", icon: IconPackage },
  { label: "Payments", href: "/admin/payments", icon: IconCash },
  { label: "Products", href: "/admin/products", icon: IconTag },
  { label: "Categories", href: "/admin/categories", icon: IconLayers },
  { label: "Customers", href: "/admin/customers", icon: IconUser },
  { label: "Inventory", href: "/admin/inventory", icon: IconBox },
  { label: "Homepage", href: "/admin/homepage", icon: IconHome },
  { label: "Analytics", href: "/admin/analytics", icon: IconBarChart },
  { label: "Settings", href: "/admin/settings/delivery", icon: IconSettings },
];

export function isAdminLinkActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
