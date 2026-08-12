import Link from "next/link";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a given page number, e.g. `(n) => \`/admin/orders?page=${n}\`` — caller owns preserving other query params. */
  pageHref: (page: number) => string;
}

/** Same plain Link-based pagination pattern as the storefront's `ProductListingPage` — kept consistent rather than pulling in a table/pagination library for the admin shell. */
export function AdminPagination({ page, totalPages, pageHref }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-2">
      <Link
        href={pageHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-small font-medium text-foreground transition-colors ${page <= 1 ? "pointer-events-none opacity-40" : "hover:border-accent"}`}
      >
        Previous
      </Link>
      <span className="px-2 text-small text-foreground/70">
        Page {page} of {totalPages}
      </span>
      <Link
        href={pageHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-small font-medium text-foreground transition-colors ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:border-accent"}`}
      >
        Next
      </Link>
    </nav>
  );
}
