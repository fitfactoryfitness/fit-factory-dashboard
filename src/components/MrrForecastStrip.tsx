import { fmtCurrency } from "@/lib/format";

// Forward MRR forecast — three values read directly from the spreadsheet's
// own confirmed columns (AG/AH/AI: next 1/2/3 months), no calculation. Bar
// widths are each value's share of the $100k MRR target (business rule
// supplied by ownership, not a spreadsheet cell) — 100% width = $100k,
// capped at 100% if a forecast value ever exceeds it — not a proportion of
// the three values to each other.
const MRR_TARGET = 100_000;

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

  return (
    <div className="w-full rounded-xl border border-bg-border bg-bg-panel px-4 md:px-5 py-3 md:py-2 flex flex-col md:flex-row md:items-center gap-3 md:gap-8 overflow-hidden md:h-full">
      <span className="text-sm font-bold text-slate-300 uppercase tracking-wide shrink-0">MRR Forecast</span>
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8 md:flex-1">
        {entries.map((e, i) => {
          const pct = e.value !== null ? Math.min(100, Math.max(4, (e.value / MRR_TARGET) * 100)) : 0;
          return (
            <div key={e.label} className="flex items-center gap-3 min-w-0 md:flex-1">
              <div className="min-w-0 shrink-0 w-44">
                <div className="text-xs text-slate-500 uppercase tracking-wide truncate">{e.label}</div>
                <div className="text-lg font-bold text-white truncate">
                  {fmtCurrency(e.value)}
                  <span className="text-slate-500 font-medium text-sm"> / {fmtCurrency(MRR_TARGET)}</span>
                </div>
              </div>
              <div className="flex-1 h-3.5 rounded-full bg-bg-border overflow-hidden min-w-[40px]">
                {e.value !== null ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400"
                    style={{ width: `${pct}%` }}
                  />
                ) : (
                  <div className="h-full flex items-center px-2 text-xs text-slate-600">no data</div>
                )}
              </div>
              {i < entries.length - 1 && <span className="hidden md:inline text-slate-600 shrink-0 text-lg">→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
