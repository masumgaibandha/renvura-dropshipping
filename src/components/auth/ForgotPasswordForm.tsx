"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { emailOtp } from "@/lib/auth-client";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";

/**
 * `/forgot-password` — always shows the same generic confirmation
 * regardless of whether the email actually has an account, matching
 * `authClient.emailOtp.requestPasswordReset()` itself (Better Auth's
 * `/email-otp/request-password-reset` endpoint always returns
 * `{success:true}`, see `node_modules/better-auth/dist/plugins/email-otp/routes.mjs`)
 * — there is deliberately no branching here that could leak account
 * existence.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    await emailOtp.requestPasswordReset({ email });
    setIsSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-small text-foreground">If an account exists for this email, we&apos;ve sent password reset instructions.</p>
        <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="text-small font-medium text-accent hover:underline">
          Enter the code
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="forgot-password-email" className={labelClass}>
          Email
        </label>
        <input
          id="forgot-password-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Sending…" : "Send Reset Instructions"}
      </button>

      <p className="text-center text-small text-foreground/70">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
