import type { Metadata } from "next";

import { ProfileForm } from "@/components/account/ProfileForm";
import { getCurrentUser } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Profile" };

export default async function AccountProfilePage() {
  const user = (await getCurrentUser())!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-h3 text-foreground">Profile</h2>
        <p className="mt-1 text-small text-foreground/70">
          Email: <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </div>
      <ProfileForm initialName={user.name} initialPhone={user.phone ?? ""} />
    </div>
  );
}
