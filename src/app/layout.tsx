import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import clsx from "clsx";
import "./globals.css";

import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { RouteTracker } from "@/components/analytics/RouteTracker";
import { Providers } from "@/components/layout/providers";
import { StoreShell } from "@/components/layout/StoreShell";
import { brand, isConfigured } from "@/config/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Only set once a real production domain exists — without it, relative canonical
  // URLs on individual routes (see /shop, /electronics-gadgets, /health-beauty)
  // would resolve incorrectly, so those routes gate their own canonical the same way.
  ...(isConfigured(brand.urls.site) ? { metadataBase: new URL(brand.urls.site) } : {}),
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  icons: {
    icon: brand.assets.favicon.light,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={clsx(geistSans.variable, geistMono.variable, "h-full antialiased")}
    >
      <body className="min-h-full">
        <AnalyticsScripts />
        <RouteTracker />
        <Providers themeProps={{ attribute: "class", defaultTheme: "light", forcedTheme: "light", enableSystem: false }}>
          <StoreShell>{children}</StoreShell>
        </Providers>
      </body>
    </html>
  );
}
