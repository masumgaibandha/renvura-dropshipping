import type { ReactNode } from "react";

import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

interface AdminLayoutProps {
  adminName: string;
  adminEmail: string;
  children: ReactNode;
}

/** Desktop: fixed dark sidebar + top bar + content. Mobile: top bar owns a drawer (see AdminTopBar). Server Component — AdminSidebar/AdminTopBar are the only client leaves. */
export function AdminLayout({ adminName, adminEmail, children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background-secondary">
      <AdminTopBar adminName={adminName} adminEmail={adminEmail} />
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="fixed h-[calc(100vh-3.5rem)] w-56">
            <AdminSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
