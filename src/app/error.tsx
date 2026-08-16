"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Container } from "@/components/layout/Container";

/**
 * Root error boundary — Next.js requires this to be a Client Component
 * (error boundaries are inherently client-side in React). Catches any
 * unhandled error in a Server/Client Component render so a real customer
 * never sees Next's raw unstyled error screen. `error.message` is never
 * rendered — it can contain internal details (a Mongo error string, a
 * stack fragment) that don't belong in front of a customer; the console
 * log is for whoever's watching server/browser logs, not the visitor.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-h1 text-foreground">Something went wrong</h1>
      <p className="max-w-md text-body text-foreground/70">
        We hit an unexpected error loading this page. Please try again, or head back to the homepage.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-border px-6 text-small font-medium text-foreground transition-colors hover:border-accent"
        >
          Back to Home
        </Link>
      </div>
    </Container>
  );
}
