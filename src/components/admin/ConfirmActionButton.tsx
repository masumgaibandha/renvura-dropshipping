"use client";

import { AlertDialog, Button, type ButtonProps } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ConfirmActionButtonProps {
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /** Server Action (or a wrapper around one) — return `{ ok: false, error }` on failure, anything else counts as success. */
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}

/**
 * The one confirmation dialog for every destructive/high-value admin
 * action (cancel order, archive product, deactivate category, mark
 * payment failed, etc.) — built on HeroUI's `AlertDialog`, never a native
 * `window.confirm()`. On success it calls `router.refresh()` so the
 * Server Component page re-fetches without a full navigation.
 */
export function ConfirmActionButton({
  label,
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirm",
  variant = "danger",
  size = "sm",
  className,
  onConfirm,
}: ConfirmActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog.Root isOpen={isOpen} onOpenChange={setIsOpen}>
      <AlertDialog.Trigger>
        <Button variant={variant} size={size} className={className}>
          {label}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>{confirmTitle}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-small text-foreground/70">{confirmDescription}</p>
              {error && (
                <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-small text-red-700">
                  {error}
                </p>
              )}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" size="sm" isDisabled={isPending} onPress={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant={variant} size="sm" isDisabled={isPending} onPress={handleConfirm}>
                {isPending ? "Working…" : confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}
