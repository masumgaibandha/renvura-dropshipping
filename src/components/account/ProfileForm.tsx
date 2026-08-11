"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { updateUser } from "@/lib/auth-client";
import { normalizeBdPhone } from "@/utils/phone";

interface ProfileFormProps {
  initialName: string;
  initialPhone: string;
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";

/**
 * Updates go through Better Auth's own `authClient.updateUser()` — it
 * already derives the user from the session cookie, so there's no
 * `userId` parameter to worry about here. Phone is validated/normalized
 * client-side with the same `normalizeBdPhone` checkout uses — proportionate
 * for self-owned profile data (unlike order pricing, which is fully
 * server-revalidated). Email is intentionally not editable — this phase
 * doesn't implement a verified email-change flow.
 */
export function ProfileForm({ initialName, initialPhone }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Enter your full name.");
      return;
    }

    let normalizedPhone: string | undefined;
    if (phone.trim().length > 0) {
      const normalized = normalizeBdPhone(phone.trim());
      if (!normalized) {
        setError("Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).");
        return;
      }
      normalizedPhone = normalized;
    }

    setIsSubmitting(true);
    const { error: updateError } = await updateUser({ name: trimmedName, phone: normalizedPhone ?? "" });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message ?? "Something went wrong updating your profile. Please try again.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-name" className={labelClass}>
          Full Name
        </label>
        <input id="profile-name" type="text" required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-phone" className={labelClass}>
          Mobile Number <span className="font-normal text-foreground/70">(optional)</span>
        </label>
        <input
          id="profile-phone"
          type="tel"
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
      )}
      {success && <p className="rounded-lg border border-border bg-surface-soft p-3 text-small text-foreground">Profile updated.</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-start sm:px-6"
      >
        {isSubmitting ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
