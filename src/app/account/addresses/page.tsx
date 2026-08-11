import type { Metadata } from "next";

import { AddressList } from "@/components/account/AddressList";
import { getCurrentUser } from "@/lib/auth-session";
import { getAddressesForUser } from "@/services/addresses";

export const metadata: Metadata = { title: "Saved Addresses" };

export default async function AccountAddressesPage() {
  const user = (await getCurrentUser())!;
  const addresses = await getAddressesForUser(user.id);

  return (
    <div>
      <h2 className="text-h3 text-foreground">Saved Addresses</h2>
      <div className="mt-4">
        <AddressList addresses={addresses} />
      </div>
    </div>
  );
}
