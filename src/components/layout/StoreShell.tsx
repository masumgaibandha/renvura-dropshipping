import type { ReactNode } from "react";

import { AnnouncementBar } from "./AnnouncementBar";
import { Footer } from "./Footer";
import { Header } from "./Header";

/**
 * Base page shell shared by every route: AnnouncementBar → Header → page
 * content → Footer. Wired into src/app/layout.tsx so individual pages
 * never need to re-declare it. See docs/ARCHITECTURE.md.
 */
export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
