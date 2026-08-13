"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { emailOtp, signIn } from "@/lib/auth-client";
import { getSafeRedirectPath } from "@/utils/safe-redirect";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";

/**
 * Reads `callbackURL` via `useSearchParams()`, which requires a Suspense
 * boundary on any route that could be statically rendered — same reason
 * `SearchBar.tsx` splits into an outer Suspense wrapper and this inner
 * component.
 */
function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set only when Better Auth's own `EMAIL_NOT_VERIFIED` error is returned — this branch is only
  // reachable after the password already matched (see `sign-in.mjs`), so surfacing it here reveals
  // nothing beyond what Better Auth's own design already does.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn.email({ email, password });

    setIsSubmitting(false);

    if (signInError) {
      if (signInError.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email);
        setError("Please verify your email to continue.");
        return;
      }
      // Deliberately generic — never confirm/deny whether this email has an account.
      setError("Invalid email or password.");
      return;
    }

    const destination = getSafeRedirectPath(searchParams.get("callbackURL"));
    router.push(destination);
    router.refresh();
  }

  async function handleResend() {
    if (!unverifiedEmail) return;
    setIsResending(true);
    await emailOtp.sendVerificationOtp({ email: unverifiedEmail, type: "email-verification" });
    router.push(`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`);
  }

  const resetSuccess = searchParams.get("reset") === "success";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      {resetSuccess && (
        <p className="rounded-lg border border-border bg-surface-soft p-3 text-small text-foreground">
          Your password has been reset. Sign in with your new password.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className={labelClass}>
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <Link href="/forgot-password" className="text-small font-medium text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          <p>{error}</p>
          {unverifiedEmail && (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="self-start font-medium underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending ? "Sending…" : "Resend verification code"}
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-center text-small text-foreground/70">
        New to Renvura?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
