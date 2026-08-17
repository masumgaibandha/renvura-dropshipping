import Link from "next/link";

import { ProductGrid } from "@/components/ecommerce/ProductGrid";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";
import { getAllCategories, getAllProducts, getProductListing, toPublicProduct } from "@/services/products";
import { MobileFilterDrawer } from "./MobileFilterDrawer";
import { SortSelect } from "./SortSelect";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

interface ProductListingPageProps {
  /** Omitted for /shop (all categories); set for a category-scoped route. */
  categorySlug?: string;
  title: string;
  description: string;
  searchParams: Promise<RawSearchParams>;
}

/**
 * Shared listing UI for /shop, /electronics-gadgets, and /health-beauty —
 * see src/services/products.ts's getProductListing for the filter/sort/
 * search/pagination logic itself (kept out of this component so it isn't
 * duplicated per route). Server Component: reads searchParams directly,
 * no client-side fetching. Category pills, pagination, and the empty
 * state's links are plain server-rendered <Link>s — the only Client
 * Components involved are SortSelect (needs router.push on a native
 * <select>'s onChange) and MobileFilterDrawer (needs open/close state).
 */
export async function ProductListingPage({ categorySlug, title, description, searchParams }: ProductListingPageProps) {
  const params = await searchParams;
  const category = categorySlug ?? firstParam(params.category);
  const sort = firstParam(params.sort);
  const q = firstParam(params.q);
  const availability = firstParam(params.availability);
  const page = firstParam(params.page);

  const [allProducts, allCategories] = await Promise.all([getAllProducts(), getAllCategories()]);
  const categoryBySlug = new Map(allCategories.map((item) => [item.slug, item]));
  const listing = getProductListing(allProducts, { category, sort, q, availability, page }, (slug) => categoryBySlug.get(slug));
  const topCategories = allCategories.filter((item) => !item.parentSlug && item.isActive);
  const activeCategory = categorySlug ? categoryBySlug.get(categorySlug) : undefined;
  const categoryLabels = Object.fromEntries(allCategories.map((item) => [item.slug, item.name]));

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    activeCategory ? { label: activeCategory.name } : { label: "Shop" },
  ];

  // Base query string (everything except `page`) — reused to build pagination links.
  const baseParams = new URLSearchParams();
  if (!categorySlug && category) baseParams.set("category", category);
  if (listing.sort !== "featured") baseParams.set("sort", listing.sort);
  if (q) baseParams.set("q", q);
  if (availability) baseParams.set("availability", availability);
  const basePath = categorySlug ? `/${categorySlug}` : "/shop";

  function pageHref(pageNumber: number): string {
    const pageParams = new URLSearchParams(baseParams);
    if (pageNumber > 1) pageParams.set("page", String(pageNumber));
    const query = pageParams.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const clearFiltersHref = basePath;

  // Pagination is windowed to at most 4 visible page numbers at once (never the old "show every
  // page" row), aligned to fixed blocks — 1-4, then 5-8, then 9-12 — so the window only advances
  // when the user actually crosses into the next block, not on every single page click.
  const PAGE_WINDOW_SIZE = 4;
  const pageWindowStart = Math.floor((listing.page - 1) / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE + 1;
  const pageWindowEnd = Math.min(pageWindowStart + PAGE_WINDOW_SIZE - 1, listing.totalPages);
  const visiblePageNumbers = Array.from({ length: pageWindowEnd - pageWindowStart + 1 }, (_, index) => pageWindowStart + index);

  // Only rendered once real out-of-stock products exist — with today's catalog (all in_stock)
  // this toggle would remove nothing, so it stays hidden rather than showing a no-op control.
  const inStockToggleParams = new URLSearchParams(baseParams);
  if (availability === "in_stock") inStockToggleParams.delete("availability");
  else inStockToggleParams.set("availability", "in_stock");
  const inStockToggleQuery = inStockToggleParams.toString();
  const inStockToggleHref = inStockToggleQuery ? `${basePath}?${inStockToggleQuery}` : basePath;

  const filterControls = (
    <div className="flex flex-wrap items-center gap-3">
      {!categorySlug && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          <CategoryPill href="/shop" label="All" active={!category} />
          {topCategories.map((item) => (
            <CategoryPill key={item.slug} href={`/shop?category=${item.slug}`} label={item.name} active={category === item.slug} />
          ))}
        </div>
      )}
      {listing.hasOutOfStock && (
        <CategoryPill href={inStockToggleHref} label="In stock only" active={availability === "in_stock"} />
      )}
      <SortSelect currentSort={listing.sort} availableSorts={listing.availableSorts} className="ml-auto md:ml-0" />
    </div>
  );

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-2 md:mb-4" />

      <h1 className="text-h1 text-foreground">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-body text-foreground/70 md:mt-2">{description}</p>
      <p className="mt-2 text-small font-medium text-foreground/70">
        {listing.total} {listing.total === 1 ? "product" : "products"}
      </p>

      <div className="mt-4 flex items-center justify-between gap-4 border-y border-border py-3 md:mt-6 md:py-4">
        <div className="hidden md:flex">{filterControls}</div>
        <div className="md:hidden">
          <MobileFilterDrawer>{filterControls}</MobileFilterDrawer>
        </div>
      </div>

      <div className="mt-5 md:mt-8">
        {listing.products.length > 0 ? (
          <ProductGrid products={listing.products.map(toPublicProduct)} categoryLabels={categoryLabels} />
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-body text-foreground/70">No products found for the selected filters.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={clearFiltersHref}
                className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-5 text-small font-medium text-foreground transition-colors hover:border-accent"
              >
                Clear filters
              </Link>
              {categorySlug && (
                <Link
                  href="/shop"
                  className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-small font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Back to Shop
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {listing.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-1.5 sm:gap-2 md:mt-10">
          <PaginationArrow direction="previous" href={listing.page > 1 ? pageHref(listing.page - 1) : undefined} />
          {visiblePageNumbers.map((pageNumber) => (
            <Link
              key={pageNumber}
              href={pageHref(pageNumber)}
              aria-current={pageNumber === listing.page ? "page" : undefined}
              className={`inline-flex size-10 items-center justify-center rounded-full text-small font-medium transition-colors md:size-11 ${
                pageNumber === listing.page
                  ? "bg-accent text-white shadow-sm"
                  : "border border-border bg-surface text-foreground hover:border-accent"
              }`}
            >
              {pageNumber}
            </Link>
          ))}
          <PaginationArrow direction="next" href={listing.page < listing.totalPages ? pageHref(listing.page + 1) : undefined} />
        </nav>
      )}
    </Container>
  );
}

/**
 * Previous/Next pagination control. Icon-only on mobile (keeps the whole
 * pagination row — 2 arrows + up to 4 page numbers — comfortably within a
 * 375px viewport with no overflow); text label reappears at `sm:`. Renders
 * as an inert `<span>` (not a disabled `<Link>`, which can't truly disable
 * navigation) on the first/last page.
 */
function PaginationArrow({ href, direction }: { href?: string; direction: "previous" | "next" }) {
  const label = direction === "previous" ? "Previous page" : "Next page";
  const Icon = direction === "previous" ? IconArrowLeft : IconArrowRight;
  const content = (
    <>
      {direction === "previous" && <Icon className="size-4 sm:hidden" />}
      <span className="hidden sm:inline">{direction === "previous" ? "Previous" : "Next"}</span>
      {direction === "next" && <Icon className="size-4 sm:hidden" />}
    </>
  );
  const sharedClassName = "inline-flex h-10 items-center justify-center gap-1 rounded-full px-3 text-small font-medium sm:px-4 md:h-11";

  if (!href) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${sharedClassName} border border-border text-foreground/40`}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${sharedClassName} border border-border bg-surface text-foreground transition-colors hover:border-accent hover:text-accent`}
    >
      {content}
    </Link>
  );
}

function CategoryPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex h-10 items-center rounded-full px-4 text-small font-medium transition-colors ${
        active
          ? "bg-accent text-white shadow-sm"
          : "border border-border bg-surface text-foreground hover:border-accent hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );
}
