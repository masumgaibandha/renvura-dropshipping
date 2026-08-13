"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { emailOtp } from "@/lib/auth-client";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-center text-body tracking-[0.5em] text-foreground placeholder:tracking-normal placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";
const RESEND_COOLDOWN_SECONDS = 45;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * `/verify-email` — reached from `SignupForm.tsx` (after signup) and
 * `LoginForm.tsx` (after a blocked unverified-account sign-in). Success
 * creates a session automatically (`autoSignInAfterVerification: true` in
 * `src/lib/auth.ts`), so this redirects straight to `/account`, no
 * separate login step.
 */
function VerifyEmailFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email) {
      setError("Missing email address. Please sign up or sign in again.");
      return;
    }

    setIsSubmitting(true);
    const { error: verifyError } = await emailOtp.verifyEmail({ email, otp });
    setIsSubmitting(false);

    if (verifyError) {
      if (verifyError.status === 429) {
        // Better Auth's own per-path request throttle — a transport-level rejection, not a
        // judgment on the code itself. See `ResetPasswordForm.tsx` for the full explanation of why
        // this needs its own branch rather than falling into the generic "incorrect code" message.
        setError("Too many attempts in a short time. Please wait a minute and try again.");
      } else if (verifyError.code === "OTP_EXPIRED") {
        setError("This code has expired. Request a new one.");
      } else if (verifyError.code === "TOO_MANY_ATTEMPTS") {
        setError("Too many attempts. Request a new code.");
      } else {
        setError("Incorrect code. Please try again.");
      }
      return;
    }

    router.push("/account");
    router.refresh();
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    setError(null);
    await emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    setIsResending(false);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <p className="text-center text-small text-foreground/70">
        {email ? (
          <>
            We sent a 6-digit code to <span className="font-medium text-foreground">{maskEmail(email)}</span>.
          </>
        ) : (
          "Enter the code we sent to your email."
        )}
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="verify-email-otp" className={labelClass}>
          Verification Code
        </label>
        <input
          id="verify-email-otp"
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

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || otp.length !== 6}
        className="flex h-11 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Verifying…" : "Verify"}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={isResending || cooldown > 0}
        className="self-center text-small font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:text-foreground/50 disabled:no-underline"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : isResending ? "Sending…" : "Resend code"}
      </button>

      <p className="text-center text-small text-foreground/70">
        Wrong email?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Start over
        </Link>
      </p>
    </form>
  );
}

export function VerifyEmailForm() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailFormInner />
    </Suspense>
  );
}
