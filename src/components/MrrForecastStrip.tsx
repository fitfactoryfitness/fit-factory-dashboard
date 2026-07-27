import { fmtCurrency } from "@/lib/format";

// Forward MRR forecast — three values read directly from the spreadsheet's
// own confirmed columns (AG/AH/AI: next 1/2/3 months), no calculation. Bar
// widths are each value's share of the $100k MRR target (business rule
// supplied by ownership, not a spreadsheet cell) — 100% width = $100k,
// capped at 100% if a forecast value ever exceeds it — not a proportion of
// the three values to each other.
const MRR_TARGET = 100_000;

// Day-over-day trend arrow: compares today's posted snapshot for a given
// forecast column against the immediately-prior non-blank entry in that same
// column (e.g. Aug forecast on Jul 11 vs Aug forecast on Jul 10) — not a
// comparison between the three forecast columns themselves. Green/up if the
// snapshot increased since the last entry, red/down if it decreased, no
// arrow if flat or there's no prior entry yet to compare against.
function TrendArrow({ value, previous }: { value: number | null; previous: number | null }) {
  if (value === null || previous === null || value === previous) return null;
  const isUp = value > previous;
  const delta = Math.abs(value - previous);
  return (
    <span
      className={`inline-flex items-center gap-0.5 shrink-0 ${isUp ? "text-emerald-400" : "text-red-400"}`}
      title={`${isUp ? "Up" : "Down"} ${fmtCurrency(delta)} since last update`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className={isUp ? "" : "rotate-180"}
        aria-hidden="true"
      >
        <path d="M6 15L12 9L18 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function MrrForecastStrip({
  plus1,
  plus2,
  plus3,
  plus1Previous,
  plus2Previous,
  plus3Previous,
}: {
  plus1: number | null;
  plus2: number | null;
  plus3: number | null;
  plus1Previous: number | null;
  plus2Previous: number | null;
  plus3Previous: number | null;
}) {
  const entries = [
    { label: "Next Month", value: plus1, previous: plus1Previous },
    { label: "+2 Months", value: plus2, previous: plus2Previous },
    { label: "+3 Months", value: plus3, previous: plus3Previous },
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
                <div className="text-lg font-bold text-white truncate flex items-center gap-1.5">
                  {fmtCurrency(e.value)}
                  <span className="text-slate-500 font-medium text-sm"> / {fmtCurrency(MRR_TARGET)}</span>
                  <TrendArrow value={e.value} previous={e.previous} />
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
