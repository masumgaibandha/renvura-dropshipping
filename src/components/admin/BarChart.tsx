export interface BarChartRow {
  label: string;
  value: number;
  displayValue: string;
  /** Tailwind background class — reuse the same status-color mapping `StatusBadge.tsx` uses so a bar's color always means the same thing it does everywhere else in the admin. Defaults to the brand accent for single-hue magnitude charts (e.g. daily sales). */
  colorClass?: string;
}

/**
 * Minimal horizontal bar chart — plain divs, no charting library (see
 * CLAUDE.md "avoid adding a heavy chart dependency if basic CSS/SVG/table
 * visualization is enough"). Each bar carries a native `title` tooltip and
 * a visible direct label, and the whole chart is backed by a real `<table>`
 * (visually hidden, `sr-only`) so a screen reader — or anyone who wants the
 * exact numbers — gets a data table, not just relative bar lengths.
 */
export function BarChart({ rows, caption }: { rows: BarChartRow[]; caption: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.displayValue}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3" title={`${row.label}: ${row.displayValue}`}>
            <span className="w-28 shrink-0 truncate text-xs text-foreground/70">{row.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-background-secondary">
              <div className={`h-full rounded-full ${row.colorClass ?? "bg-accent"}`} style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-medium text-foreground">{row.displayValue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
