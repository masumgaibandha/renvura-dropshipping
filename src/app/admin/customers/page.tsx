import Link from "next/link";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { listCustomersForAdmin } from "@/services/customers";
import { formatBDT } from "@/utils/currency";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const page = Number.parseInt(firstParam(params.page) ?? "1", 10) || 1;

  const result = await listCustomersForAdmin({ page, search });

  function pageHref(pageNumber: number): string {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (pageNumber > 1) query.set("page", String(pageNumber));
    const qs = query.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Customers</h1>
        <p className="mt-1 text-small text-foreground/70">{result.total} customer{result.total === 1 ? "" : "s"}</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-foreground/70">Search</label>
          <input id="q" name="q" defaultValue={search} placeholder="Name, email, or phone" className="h-9 w-64 rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </div>
        <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover">
          Search
        </button>
        {search && (
          <Link href="/admin/customers" className="h-9 inline-flex items-center text-small font-medium text-foreground/70 hover:text-foreground">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[840px] text-small">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/70">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Account Created</th>
              <th className="p-3 font-medium">Orders</th>
              <th className="p-3 font-medium">Delivered Value</th>
              <th className="p-3 font-medium">Last Order</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {result.customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-foreground/70">
                  No customers match this search.
                </td>
              </tr>
            ) : (
              result.customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium text-foreground">{customer.name}</td>
                  <td className="p-3 text-foreground/70">{customer.email}</td>
                  <td className="p-3 text-foreground/70">{customer.phone ?? "—"}</td>
                  <td className="p-3 text-foreground/70">{new Date(customer.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="p-3 text-foreground/70">{customer.orderCount}</td>
                  <td className="p-3 text-foreground">{formatBDT(customer.totalDeliveredValue)}</td>
                  <td className="p-3 text-foreground/70">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="p-3">
                    <Link href={`/admin/customers/${customer.id}`} className="font-medium text-accent hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} pageHref={pageHref} />
    </div>
  );
}
