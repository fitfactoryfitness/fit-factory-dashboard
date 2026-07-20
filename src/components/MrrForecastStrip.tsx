import { fmtCurrency } from "@/lib/format";

// Forward MRR forecast — three values read directly from the spreadsheet's
// own confirmed columns (AG/AH/AI: next 1/2/3 months), no calculation. Bar
// widths below are a purely visual proportion of the three values to each
// other (max = 100%), not a computed metric in their own right.
export function MrrForecastStrip({
  plus1,
  plus2,
  plus3,
}: {
  plus1: number | null;
  plus2: number | null;
  plus3: number | null;
}) {
  const entries = [
    { label: "Next Month", value: plus1 },
    { label: "+2 Months", value: plus2 },
    { label: "+3 Months", value: plus3 },
  ];
  const max = Math.max(1, ...entries.map((e) => e.value ?? 0));

  return (
    <div className="h-full w-full rounded-xl border border-bg-border bg-bg-panel px-5 py-2 flex items-center gap-8 overflow-hidden">
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide shrink-0">MRR Forecast</span>
      {entries.map((e, i) => {
        const pct = e.value !== null ? Math.max(4, (e.value / max) * 100) : 0;
        return (
          <div key={e.label} className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 shrink-0 w-24">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide truncate">{e.label}</div>
              <div className="text-sm font-bold text-white truncate">{fmtCurrency(e.value)}</div>
            </div>
            <div className="flex-1 h-2.5 rounded-full bg-bg-border overflow-hidden min-w-[40px]">
              {e.value !== null ? (
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400"
                  style={{ width: `${pct}%` }}
                />
              ) : (
                <div className="h-full flex items-center px-2 text-[9px] text-slate-600">no data</div>
              )}
            </div>
            {i < entries.length - 1 && <span className="text-slate-600 shrink-0">→</span>}
          </div>
        );
      })}
    </div>
  );
}
