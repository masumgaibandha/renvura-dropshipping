"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { signIn } from "@/lib/auth-client";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn.email({ email, password });

    setIsSubmitting(false);

    if (signInError) {
      // Deliberately generic — never confirm/deny whether this email has an account.
      setError("Invalid email or password.");
      return;
    }

    const destination = getSafeRedirectPath(searchParams.get("callbackURL"));
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
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
        <label htmlFor="login-password" className={labelClass}>
          Password
        </label>
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
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
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
