"use client";

import { MonthlySummary, MetricStatus } from "@/types/dashboard";
import { fmtCurrency, fmtSigned, STATUS_COLORS } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";

export function RevenueHero({
  summary,
  goalProgress,
  calendarProgressPct,
  remaining,
  requiredDaily,
  actualDaily,
  revenueStatus,
}: {
  summary: MonthlySummary;
  goalProgress: number | null;
  calendarProgressPct: number;
  remaining: number | null;
  requiredDaily: number | null;
  actualDaily: number | null;
  revenueStatus: MetricStatus;
}) {
  const pct = goalProgress !== null ? goalProgress * 100 : null;
  const colors = STATUS_COLORS[revenueStatus] ?? STATUS_COLORS.unavailable;
  const paceDelta = pct !== null ? pct - calendarProgressPct : null;

  return (
    <div className={`rounded-2xl border ${colors.border} bg-bg-card p-4 md:p-5 flex flex-col gap-2.5 h-full overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
        <h2 className="text-slate-300 text-base md:text-xl font-bold uppercase tracking-wide truncate">Revenue MTD — Downtown</h2>
        <span className={`shrink-0 text-xs md:text-base font-bold px-3 md:px-4 py-1 md:py-1.5 rounded whitespace-nowrap ${colors.bg} ${colors.text}`}>
          {paceDelta !== null ? (paceDelta >= 0 ? "Ahead of calendar pace" : "Behind calendar pace") : "No data"}
        </span>
      </div>

      <div className="flex items-baseline gap-2 md:gap-3 min-w-0 shrink-0 flex-wrap">
        <span className="text-4xl md:text-7xl font-black text-white leading-none tracking-tight truncate">{fmtCurrency(summary.revenueMTD)}</span>
        <span className="text-xl md:text-4xl text-slate-400 font-semibold shrink-0"> / {fmtCurrency(summary.revenueGoal)}</span>
      </div>

      {/* The four supporting stats sit in a single full-width row above the
          progress bar, not beside it — putting them next to the bar forced
          a 2x2 grid crammed into a narrow column, which is what kept
          clipping. A single row scales with the card's full width instead
          of a fraction of it, so each stat gets more room at every zoom
          level, and the bar underneath reads as one continuous element
          instead of being squeezed to 2/3 width. */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 md:gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6">
          <Stat label="Projected month-end" value={fmtCurrency(summary.projectedRevenue)} />
          <Stat label="Gap to goal" value={fmtSigned(summary.revenueGap, fmtCurrency)} negative={(summary.revenueGap ?? 0) < 0} />
          <Stat label="Required / remaining day" value={fmtCurrency(requiredDaily !== null ? Math.ceil(requiredDaily) : null)} />
          <Stat label="Actual avg / day" value={fmtCurrency(actualDaily)} />
        </div>

        <div className="flex flex-col gap-2">
          <ProgressBar currentPct={pct} expectedPct={calendarProgressPct} status={revenueStatus} height="h-4 md:h-6" />
          <div className="flex justify-between text-sm md:text-lg">
            <span className="text-slate-300 font-semibold">{pct !== null ? `${pct.toFixed(1)}% achieved` : "—"}</span>
            <span className="text-slate-400">{calendarProgressPct.toFixed(1)}% of month elapsed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-slate-500 uppercase text-xs md:text-sm tracking-wide truncate">{label}</div>
      <div className={`text-xl md:text-3xl font-bold truncate ${negative ? "text-red-400" : "text-white"}`}>{value}</div>
    </div>
  );
}
