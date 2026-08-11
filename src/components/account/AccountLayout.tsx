import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import { AccountMobileNav } from "./AccountMobileNav";
import { AccountSidebar } from "./AccountSidebar";

interface AccountLayoutProps {
  children: ReactNode;
}

/** Desktop: sidebar + content grid. Mobile: horizontal pill nav above content. Server Component — AccountSidebar/AccountMobileNav are the only client leaves (usePathname()-driven active state). */
export function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <Container>
      <h1 className="text-h1 mt-6 text-foreground">My Account</h1>

      <div className="mt-6 lg:hidden">
        <AccountMobileNav />
      </div>

      <div className="mt-6 grid gap-8 pb-16 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <AccountSidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
