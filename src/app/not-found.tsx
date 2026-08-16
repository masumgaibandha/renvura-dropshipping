import Link from "next/link";

import { Container } from "@/components/layout/Container";

/**
 * Root 404 boundary — Next.js renders this for every unmatched route and
 * every explicit `notFound()` call (order lookups, product/category pages,
 * account ownership mismatches) that previously fell through to Next's
 * generic unstyled default. No product/order data is available here by
 * design (a `notFound()` call deliberately discards it — see the
 * ownership-mismatch pattern in account/orders), so this stays generic
 * rather than guessing at what the visitor was looking for.
 */
export default function NotFound() {
  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-label text-accent uppercase">404</p>
      <h1 className="text-h1 text-foreground">Page not found</h1>
      <p className="max-w-md text-body text-foreground/70">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Back to Home
        </Link>
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-full border border-border px-6 text-small font-medium text-foreground transition-colors hover:border-accent"
        >
          Shop All Products
        </Link>
      </div>
    </Container>
  );
}
