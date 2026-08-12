interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

/** One metric tile for /admin's dashboard cards row and /admin/analytics — plain, compact, no icon/sparkline (see CLAUDE.md "don't over-design"). */
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <p className="mt-1 text-h3 font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-foreground/70">{hint}</p>}
    </div>
  );
}
