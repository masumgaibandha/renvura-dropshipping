import type { ReactNode } from "react";

import { Footer } from "./Footer";
import { Header } from "./Header";

/**
 * Base page shell shared by every route: Header (the one sticky navbar —
 * see its own doc comment for why the previous utility bar + secondary nav
 * rows were removed) → page content → Footer. Wired into src/app/layout.tsx
 * so individual pages never need to re-declare it. See docs/ARCHITECTURE.md.
 */
export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
