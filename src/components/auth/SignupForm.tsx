"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { signUp } from "@/lib/auth-client";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";

/**
 * `autoSignIn: true` (`src/lib/auth.ts`) means a successful signup already
 * establishes a session — no separate login step needed before landing on
 * `/account`. Password confirmation and minimum-length are checked
 * client-side before ever calling `signUp.email()`; Better Auth itself
 * re-validates length server-side regardless (8–128 chars by default).
 */
export function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
    const { error: signUpError } = await signUp.email({ name, email, password });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message ?? "Something went wrong creating your account. Please try again.");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-name" className={labelClass}>
          Full Name
        </label>
        <input
          id="signup-name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className={labelClass}>
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-password" className={labelClass}>
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-confirm-password" className={labelClass}>
          Confirm Password
        </label>
        <input
          id="signup-confirm-password"
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
        {isSubmitting ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-small text-foreground/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
