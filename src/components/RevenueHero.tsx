"use client";

import { MonthlySummary, MetricStatus } from "@/types/dashboard";
import { fmtCurrency, STATUS_COLORS } from "@/lib/format";
import { computeKpiStatus } from "@/lib/calculations/status";
import { ProgressBar } from "./ProgressBar";

export function RevenueHero({
  summary,
  goalProgress,
  calendarProgressPct,
  remaining,
  isHistorical = false,
}: {
  summary: MonthlySummary;
  goalProgress: number | null;
  calendarProgressPct: number;
  remaining: number | null;
  // A closed month has nothing left to "pace" against — calendarProgressPct
  // is forced to 100 for these (see buildViewModel), so the badge switches
  // from a pace comparison to a plain result: did it hit the goal or not.
  isHistorical?: boolean;
}) {
  const pct = goalProgress !== null ? goalProgress * 100 : null;
  const paceDelta = pct !== null ? pct - calendarProgressPct : null;

  // Badge color follows the calendar-pace comparison shown in the badge
  // text (ahead/behind pace), not the separate projected-vs-goal
  // `revenueStatus` — those two can disagree (e.g. ahead of pace today but
  // still projected to miss goal), which read as a contradiction: a red
  // card announcing "ahead of pace".
  const paceStatus: MetricStatus =
    pct === null
      ? "unavailable"
      : isHistorical
      ? pct >= 100
        ? "ahead"
        : "off-track"
      : computeKpiStatus(pct, calendarProgressPct);
  const colors = STATUS_COLORS[paceStatus] ?? STATUS_COLORS.unavailable;

  const badgeText =
    pct === null
      ? "No data"
      : isHistorical
      ? pct >= 100
        ? "Target achieved"
        : "Target missed"
      : paceDelta !== null && paceDelta >= 0
      ? "Ahead of calendar pace"
      : "Behind calendar pace";

  return (
    <div className={`rounded-2xl border ${colors.border} bg-bg-card p-4 md:p-5 flex flex-col gap-2.5 h-full overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
        <h2 className="text-slate-300 text-base md:text-xl font-bold uppercase tracking-wide truncate">Revenue MTD — Downtown</h2>
        <span className={`shrink-0 text-xs md:text-base font-bold px-3 md:px-4 py-1 md:py-1.5 rounded whitespace-nowrap ${colors.bg} ${colors.text}`}>
          {badgeText}
        </span>
      </div>

      <div className="flex items-baseline gap-2 md:gap-3 min-w-0 shrink-0 flex-wrap">
        <span className="text-4xl md:text-7xl font-black text-white leading-none tracking-tight truncate">{fmtCurrency(summary.revenueMTD)}</span>
        <span className="text-xl md:text-4xl text-slate-400 font-semibold shrink-0"> / {fmtCurrency(summary.revenueGoal)}</span>
      </div>

      {/* The four supporting stats (Projected, Gap, Required/day, Actual/day)
          now live in their own card in the KPI row next to Trials/CP to
          Trials (see RevenueMetricsCard) — keeping this card to just the big
          number and the progress bar. */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-2">
        <ProgressBar currentPct={pct} expectedPct={calendarProgressPct} status={paceStatus} height="h-4 md:h-6" />
        <div className="flex justify-between text-sm md:text-lg">
          <span className="text-slate-300 font-semibold">{pct !== null ? `${pct.toFixed(1)}% achieved` : "—"}</span>
          <span className="text-slate-400">{isHistorical ? "Month complete" : `${calendarProgressPct.toFixed(1)}% of month elapsed`}</span>
        </div>
      </div>
    </div>
  );
}
