import { DashboardPayload, KpiCardData } from "@/types/dashboard";
import {
  getCalendarProgress,
  goalProgress,
  paceVariance,
  remainingAmount,
  requiredPerRemainingDay,
  actualAverageDaily,
  expectedByToday,
  paceGap,
  daysInMonth,
} from "@/lib/calculations/pace";
import { computeOverallStatus, computeKpiStatus } from "@/lib/calculations/status";
import { evaluateTodaySoFar, TodayEvalStatus } from "@/lib/calculations/today";
import { generatePriorities } from "@/lib/priorityEngine";
import { BUSINESS_TIMEZONE } from "@/config/thresholds";
import { MONTH_ABBR } from "@/lib/googleSheets/tabResolver";

// Synthetic "calendar" for a closed month: the whole month counts as
// elapsed (calendarProgress = 1, remainingDays = 0), so every pace formula
// downstream (expectedByToday, requiredPerRemainingDay, etc.) evaluates as
// "compare the final number to the full target" rather than "compare to
// wherever real-world today happens to fall." elapsedDays is set to
// (totalDays - 1) rather than totalDays so the existing `+ 1` in the
// actualDaily call below still lands on exactly totalDays, matching how
// that same call is used for the live in-progress month.
function closedMonthCalendar(year: number, monthTab: string) {
  const monthIndex = MONTH_ABBR.indexOf(monthTab);
  const total = monthIndex >= 0 ? daysInMonth(year, monthIndex) : 30;
  return {
    year,
    monthNum: monthIndex + 1,
    day: total,
    totalDaysInMonth: total,
    elapsedDays: total - 1,
    remainingDays: 0,
    calendarProgress: 1,
  };
}

// isHistorical = true when the payload being viewed is a CLOSED past month
// (selected via the month selector/compare panel), not the live current
// month. Every pace calculation in this file ("expected by today," "need
// X/day," "ahead/behind pace") implicitly assumes today is a date WITHIN the
// month being viewed — that assumption breaks for a past month, where
// "today" (the real current date) has nothing to do with it. Concretely:
// treating a closed June as if only 85% of "the month" had elapsed (because
// today happens to be July 27) makes an already-goal-exceeding June look
// "behind pace" and renders its progress bar red. For a closed month there
// is no more pacing to do, so the calendar is instead treated as 100%
// elapsed — "expected by today" collapses to "the full target," and status
// becomes a simple "did this month hit its number," which is the only
// question that's still meaningful once the month is over.
export function buildViewModel(payload: DashboardPayload, now: Date = new Date(), isHistorical: boolean = false) {
  const { summary, daily } = payload;
  const cal = isHistorical ? closedMonthCalendar(summary.year, summary.month) : getCalendarProgress(now, BUSINESS_TIMEZONE);

  const goalProg = goalProgress(summary.revenueMTD, summary.revenueGoal);
  const variance = paceVariance(goalProg, cal.calendarProgress);
  const remaining = remainingAmount(summary.revenueGoal, summary.revenueMTD);
  const requiredDaily = requiredPerRemainingDay(remaining, cal.remainingDays);
  const actualDaily = actualAverageDaily(summary.revenueMTD, cal.elapsedDays + 1);

  // Flat monthly target rate (goal / total days in month) — a fixed
  // benchmark line for the trend chart, deliberately NOT the same value as
  // `requiredDaily` above. `requiredDaily` is "how much more per remaining
  // day to still catch up," which shrinks/grows as the month progresses and
  // isn't meant to be plotted as a static reference; this is "what a flat,
  // even pace across the whole month would have looked like," which never
  // changes once the goal and days-in-month are known.
  const flatRequiredDaily =
    summary.revenueGoal !== null && cal.totalDaysInMonth > 0 ? summary.revenueGoal / cal.totalDaysInMonth : null;

  const trialsExpected = expectedByToday(summary.trialsTarget.value, cal.calendarProgress);
  const cpExpected = expectedByToday(summary.cpToTrialsTarget.value, cal.calendarProgress);

  // For a closed month, the spreadsheet's own "PROJECTED REVENUE"/"GAP TO
  // GOAL" cells were computed mid-month and read as-is here — they're not
  // recalculated when the month closes, so they go stale (and can end up
  // contradicting the month's own final Revenue MTD, e.g. showing a
  // shortfall for a month that actually hit its goal). Once the month is
  // over, its own final MTD figure IS the outcome, so it's substituted in
  // place of the stale projection for status/display purposes — never the
  // other way around for the live current month, where the sheet's
  // in-progress projection is still the more informative number.
  const effectiveProjectedRevenue = isHistorical ? summary.revenueMTD : summary.projectedRevenue;
  const effectiveGap =
    isHistorical && summary.revenueMTD !== null && summary.revenueGoal !== null
      ? summary.revenueMTD - summary.revenueGoal
      : isHistorical
      ? null
      : summary.revenueGap;

  const overall = computeOverallStatus({
    revenueGoal: summary.revenueGoal,
    revenueMTD: summary.revenueMTD,
    projectedRevenue: effectiveProjectedRevenue,
    trialsCurrent: summary.trialsMTD,
    trialsExpectedByToday: trialsExpected,
    cpCurrent: summary.cpToTrialsMTD,
    cpExpectedByToday: cpExpected,
  });

  function kpi(
    id: string,
    label: string,
    current: number | null,
    target: number | null,
    targetSource: KpiCardData["targetSource"],
    unit: KpiCardData["unit"]
  ): KpiCardData {
    const expected = expectedByToday(target, cal.calendarProgress);
    const gap = paceGap(current, expected);
    const progressPct = target && target > 0 && current !== null ? (current / target) * 100 : null;
    const perRemaining = requiredPerRemainingDay(target !== null && current !== null ? target - current : null, cal.remainingDays);
    const hasTarget = target !== null && target > 0;
    return {
      id,
      label,
      currentValue: current,
      target,
      targetSource,
      unit,
      expectedByToday: expected,
      paceGap: gap,
      requiredPerRemainingDay: perRemaining,
      progressPct,
      // Pace status only makes sense when there's a target to pace against.
      // A metric with real data but no target (e.g. Total Sales) is not
      // "unavailable" — it just isn't being paced, so it gets a neutral
      // "tracking only" status instead of a misleading "no data" badge.
      status: hasTarget ? computeKpiStatus(current, expected) : "unavailable",
      hasTarget,
    };
  }

  // Total Sales and "Today So Far" were removed from the dashboard per
  // product decision (redundant/confusing on the TV display). Utilization
  // and Terminations cards were removed per later product feedback too —
  // the underlying summary fields still exist (still read from the
  // spreadsheet, still feed the priority engine) but no longer get their
  // own KPI card.
  const kpis: KpiCardData[] = [
    kpi("trials", "Trials", summary.trialsMTD, summary.trialsTarget.value, summary.trialsTarget.source, "count"),
    kpi("cpToTrials", "CP to Trials", summary.cpToTrialsMTD, summary.cpToTrialsTarget.value, summary.cpToTrialsTarget.source, "count"),
    kpi(
      "newMemberships",
      "New Memberships",
      summary.newMembershipsMTD,
      summary.newMembershipsTarget.value,
      summary.newMembershipsTarget.source,
      "count"
    ),
    kpi("psc", "PSC", summary.pscMTD, summary.pscTarget.value, summary.pscTarget.source, "count"),
  ];

  const priorities = generatePriorities({ summary, calendarProgress: cal.calendarProgress, remainingDays: cal.remainingDays });

  // "Today" has no meaning when viewing a closed past month — there's no
  // in-progress day to evaluate, so the card just goes neutral instead of
  // judging today's real-world revenue against a month that already ended.
  const todayEval: { status: TodayEvalStatus; reason: string } = isHistorical
    ? { status: "neutral", reason: "Viewing a past month — nothing to evaluate." }
    : evaluateTodaySoFar(payload.today?.pretaxRevenue ?? null, flatRequiredDaily, now, BUSINESS_TIMEZONE);

  return {
    cal,
    goalProgress: goalProg,
    paceVariance: variance,
    remaining,
    requiredDaily,
    flatRequiredDaily,
    actualDaily,
    overall,
    // Use these in place of summary.projectedRevenue/revenueGap wherever
    // those are displayed — for the live month they're identical to the
    // sheet's own values; for a closed month they're the corrected
    // (actual-MTD-based) figures described above.
    effectiveProjectedRevenue,
    effectiveGap,
    kpis,
    priorities,
    daily,
    todayEval,
  };
}
