/** BDT currency formatting. Server-safe, no browser APIs. */

export function formatBDT(
  amount: number | null | undefined,
  options: { showSymbol?: boolean } = {},
): string {
  const { showSymbol = true } = options;
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return showSymbol ? `৳${formatted}` : formatted;
}
