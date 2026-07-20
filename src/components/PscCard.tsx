import { fmtCurrency, fmtNumber } from "@/lib/format";

// PSC has no configured monthly target anywhere in the workbook (confirmed
// during discovery, same as Trials/CP-to-Trials before their business-rule
// fallback targets were set) — this is a plain pass-through display of the
// spreadsheet's own TOTALS-row figures (P47 = count, Q47 = revenue), not a
// paced KPI. No calculation happens here.
export function PscCard({ psc, pscRev }: { psc: number | null; pscRev: number | null }) {
  const hasData = psc !== null || pscRev !== null;
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-3 flex flex-col gap-1.5 h-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-300 text-xs font-semibold uppercase tracking-wide truncate">PSC</span>
        {!hasData && (
          <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-500/15 text-slate-400 whitespace-nowrap">
            — NO DATA
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-4 min-w-0">
        <div className="min-w-0">
          <div className="text-2xl font-extrabold text-white leading-none truncate">{fmtNumber(psc)}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Count</div>
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold text-emerald-400 leading-none truncate">{fmtCurrency(pscRev)}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Revenue</div>
        </div>
      </div>
    </div>
  );
}
