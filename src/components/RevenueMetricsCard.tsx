import { fmtCurrency, fmtSigned } from "@/lib/format";

// The four supporting revenue stats used to live inside RevenueHero, next to
// (or above) the progress bar. Moved into their own card, sitting in the KPI
// row alongside Trials / CP to Trials, per product feedback — this gives
// RevenueHero room to just show the headline number + pace bar, and gives
// these four numbers a normal KpiCard-sized box instead of being squeezed
// into a fraction of the hero card.
export function RevenueMetricsCard({
  projectedRevenue,
  revenueGap,
  requiredDaily,
  actualDaily,
}: {
  projectedRevenue: number | null;
  revenueGap: number | null;
  requiredDaily: number | null;
  actualDaily: number | null;
}) {
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-2.5 md:p-3 flex flex-col h-full overflow-hidden">
      <span className="text-slate-300 text-sm md:text-base font-semibold uppercase tracking-wide truncate mb-1">Revenue Pace</span>
      <div className="flex-1 grid grid-cols-2 gap-x-4 md:gap-x-6 content-between py-1">
        <Stat label="Projected month-end" value={fmtCurrency(projectedRevenue)} />
        <Stat label="Gap to goal" value={fmtSigned(revenueGap, fmtCurrency)} negative={(revenueGap ?? 0) < 0} />
        <Stat label="Required / day" value={fmtCurrency(requiredDaily !== null ? Math.ceil(requiredDaily) : null)} />
        <Stat label="Actual avg / day" value={fmtCurrency(actualDaily)} />
      </div>
    </div>
  );
}

function Stat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-slate-500 uppercase text-xs md:text-base tracking-wide truncate">{label}</div>
      <div className={`text-3xl md:text-5xl font-bold truncate ${negative ? "text-red-400" : "text-white"}`}>{value}</div>
    </div>
  );
}
