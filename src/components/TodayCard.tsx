"use client";

import { DailyPerformance } from "@/types/dashboard";
import { MetricStatus } from "@/types/dashboard";
import { TodayEvalStatus } from "@/lib/calculations/today";
import { fmtCurrency, fmtSigned, STATUS_COLORS } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";

const EVAL_TO_METRIC_STATUS: Record<TodayEvalStatus, MetricStatus> = {
  good: "ahead",
  "needs-attention": "off-track",
  neutral: "unavailable",
};

const EVAL_LABEL: Record<TodayEvalStatus, string> = {
  good: "GOOD DAY",
  "needs-attention": "NEEDS ATTENTION",
  neutral: "TOO EARLY",
};

// Same compact card shell as KpiCard/PscCard (rounded-2xl, colored border,
// badge + big number + progress bar) so it sits naturally stacked above
// Vacations in the same grid-rows-2 column.
export function TodayCard({
  today,
  requiredDaily,
  expectedSoFar,
  evalStatus,
}: {
  today: DailyPerformance | null;
  requiredDaily: number | null;
  // Time-of-day-adjusted expectation (see expectedRevenueSoFar) — the same
  // number evalStatus was judged against. Shown as a bar marker so "GOOD
  // DAY" next to a bar under the full daily target doesn't read as a
  // contradiction: it's ahead of what's expected by *this hour*, not of the
  // full day's target yet.
  expectedSoFar: number | null;
  evalStatus: TodayEvalStatus;
}) {
  // Pretax (FF) is the revenue figure used everywhere else in the app
  // (Revenue MTD, daily trend, etc.) — see normalize.ts's comment on why
  // it's PRETAX and not REV TOTAL. Today's number has to match that.
  const revenue = today?.pretaxRevenue ?? null;
  const hasData = revenue !== null;
  const metricStatus = EVAL_TO_METRIC_STATUS[evalStatus];
  const colors = STATUS_COLORS[metricStatus] ?? STATUS_COLORS.unavailable;
  const hasTarget = requiredDaily !== null && requiredDaily > 0;
  const progressPct = hasData && hasTarget ? (revenue / (requiredDaily as number)) * 100 : null;
  const expectedPct = hasTarget && expectedSoFar !== null ? (expectedSoFar / (requiredDaily as number)) * 100 : null;
  const gapVsExpected = hasData && expectedSoFar !== null ? revenue - expectedSoFar : null;

  return (
    <div className={`rounded-2xl border ${colors.border} bg-bg-card p-2.5 md:p-3 flex flex-col gap-1 md:gap-1.5 h-full overflow-hidden`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-300 text-sm md:text-base font-semibold uppercase tracking-wide truncate">Today</span>
        <span className={`shrink-0 text-xs md:text-sm font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded ${colors.bg} ${colors.text} whitespace-nowrap`}>
          {hasData ? EVAL_LABEL[evalStatus] : "NO DATA"}
        </span>
      </div>

      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-3xl md:text-5xl font-extrabold text-white leading-none truncate">{fmtCurrency(revenue)}</span>
        {hasTarget && <span className="text-base md:text-xl text-slate-400 font-medium shrink-0">/ {fmtCurrency(requiredDaily)}</span>}
      </div>

      {hasTarget && <ProgressBar currentPct={progressPct} expectedPct={expectedPct} status={metricStatus} height="h-2.5 md:h-3" />}

      {hasTarget ? (
        <div className="flex justify-between text-sm md:text-base text-slate-400">
          <span>{progressPct !== null ? `${progressPct.toFixed(0)}% of today's target` : "—"}</span>
          <span className="truncate">{gapVsExpected !== null ? `${fmtSigned(gapVsExpected, fmtCurrency)} vs expected pace` : ""}</span>
        </div>
      ) : (
        <div className="text-sm md:text-base text-slate-500">No daily revenue target available</div>
      )}
    </div>
  );
}
