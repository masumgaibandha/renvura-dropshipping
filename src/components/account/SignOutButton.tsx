"use client";

import { useRouter } from "next/navigation";
import { clsx } from "clsx";

import { signOut } from "@/lib/auth-client";
import { IconLogOut } from "@/components/ui/icons";

interface SignOutButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function SignOutButton({ className, showLabel = true }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={clsx(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium text-foreground/70 transition-colors hover:bg-background-secondary hover:text-accent",
        className,
      )}
    >
      <IconLogOut className="size-5" />
      {showLabel && "Sign Out"}
    </button>
  );
}
