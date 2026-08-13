"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { emailOtp } from "@/lib/auth-client";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";

/** `/reset-password` — email is prefilled from `/forgot-password`'s link but stays editable in case the customer navigated here directly. */
function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await emailOtp.resetPassword({ email, otp, password });
    setIsSubmitting(false);

    if (resetError) {
      if (resetError.status === 429) {
        // Better Auth's own per-path request throttle (`email-otp` plugin's `rateLimit`, default
        // 3 requests/60s) — a *transport*-level rejection, not an OTP/password judgment, so it has
        // no `code` field at all. Falling through to the generic branch below would misreport this
        // as "incorrect code," which is exactly the bug this fixes: the code is still perfectly
        // valid and unconsumed (see CLAUDE.md's "Password reset rejects reusing the current
        // password" section) — the customer just needs to wait for the window to reset before
        // retrying with the same code.
        setError("Too many attempts in a short time. Please wait a minute and try again with the same code.");
      } else if (resetError.code === "OTP_EXPIRED") {
        setError("This verification code has expired. Request a new code.");
      } else if (resetError.code === "TOO_MANY_ATTEMPTS") {
        setError("Too many incorrect attempts. Request a new code.");
      } else if (resetError.code === "SAME_AS_CURRENT_PASSWORD") {
        setError("Your new password cannot be the same as your current password.");
      } else if (resetError.code === "INVALID_OTP") {
        // Better Auth's `atomicVerifyOTP` throws this identical code both for a genuinely wrong
        // digit and for a code that no longer exists (already used, or never existed) — the two
        // cases aren't distinguishable from the error alone, so the copy below covers both honestly
        // rather than guessing.
        setError("That code is incorrect or has already been used. Please check it or request a new one.");
      } else {
        setError("Something went wrong resetting your password. Please try again.");
      }
      return;
    }

    router.push("/login?reset=success");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-password-email" className={labelClass}>
          Email
        </label>
        <input
          id="reset-password-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-password-otp" className={labelClass}>
          Verification Code
        </label>
        <input
          id="reset-password-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-password-new" className={labelClass}>
          New Password
        </label>
        <input
          id="reset-password-new"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-password-confirm" className={labelClass}>
          Confirm Password
        </label>
        <input
          id="reset-password-confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Resetting…" : "Reset Password"}
      </button>

      <p className="text-center text-small text-foreground/70">
        Need a new code?{" "}
        <Link href="/forgot-password" className="font-medium text-accent hover:underline">
          Start over
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
