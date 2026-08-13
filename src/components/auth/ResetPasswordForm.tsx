"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { emailOtp } from "@/lib/auth-client";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";
const RESEND_COOLDOWN_SECONDS = 45;

/**
 * `/reset-password` — email is prefilled from `/forgot-password`'s link but stays editable in
 * case the customer navigated here directly.
 *
 * **Only the most-recently-requested code is ever valid.** Better Auth's `email-otp` plugin
 * doesn't delete an older still-unexpired verification row when a new one is requested — its
 * internal adapter always resolves *both* the expiry check and the consume step to whichever row
 * has the latest `createdAt` for that identifier (confirmed by reading
 * `node_modules/better-auth/dist/db/internal-adapter.mjs`'s `findVerificationValue`/
 * `consumeVerificationValue`, both `sortBy: {field: "createdAt", direction: "desc"}, limit: 1`).
 * So if a customer requests a reset more than once (impatience while waiting for a slow email,
 * a second visit to `/forgot-password`, etc.) and then opens an *earlier* email instead of the
 * latest one, that code is genuinely, correctly rejected as `INVALID_OTP` — reproduced and
 * confirmed live against production. This isn't a bug to "fix" in the verification logic (the
 * behavior is correct and secure — a customer must always use their latest code), so the fix
 * here is UX: an inline Resend action (matching `VerifyEmailForm.tsx`'s pattern) so a customer
 * never has to guess which of several emails is current, plus copy that says so directly.
 */
function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendConfirmation, setResendConfirmation] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    setError(null);
    setResendConfirmation(null);
    await emailOtp.requestPasswordReset({ email });
    setIsResending(false);
    // Matches the generic, anti-enumeration response `ForgotPasswordForm.tsx` already relies on —
    // always shown regardless of whether the email actually has an account.
    setResendConfirmation("If an account exists for this email, a new code has been sent — use that one.");
    setOtp("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
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
        <p className="text-xs text-foreground/70">
          Only your most recently requested code works. If you asked for more than one, use the code from the newest email.
        </p>
        {resendConfirmation ? (
          <p className="text-xs text-foreground">{resendConfirmation}</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="self-start text-xs font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:text-foreground/50 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : isResending ? "Sending…" : "Resend code"}
          </button>
        )}
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
