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
} from "@/lib/calculations/pace";
import { computeOverallStatus, computeKpiStatus, computeProjectedRevenueStatus } from "@/lib/calculations/status";
import { generatePriorities } from "@/lib/priorityEngine";
import { BUSINESS_TIMEZONE } from "@/config/thresholds";

export function buildViewModel(payload: DashboardPayload, now: Date = new Date()) {
  const { summary, daily } = payload;
  const cal = getCalendarProgress(now, BUSINESS_TIMEZONE);

  const goalProg = goalProgress(summary.revenueMTD, summary.revenueGoal);
  const variance = paceVariance(goalProg, cal.calendarProgress);
  const remaining = remainingAmount(summary.revenueGoal, summary.revenueMTD);
  const requiredDaily = requiredPerRemainingDay(remaining, cal.remainingDays);
  const actualDaily = actualAverageDaily(summary.revenueMTD, cal.elapsedDays + 1);

  const trialsExpected = expectedByToday(summary.trialsTarget.value, cal.calendarProgress);
  const cpExpected = expectedByToday(summary.cpToTrialsTarget.value, cal.calendarProgress);

  const overall = computeOverallStatus({
    revenueGoal: summary.revenueGoal,
    revenueMTD: summary.revenueMTD,
    projectedRevenue: summary.projectedRevenue,
    trialsCurrent: summary.trialsMTD,
    trialsExpectedByToday: trialsExpected,
    cpCurrent: summary.cpToTrialsMTD,
    cpExpectedByToday: cpExpected,
  });

  const revenueStatus = computeProjectedRevenueStatus(summary.projectedRevenue, summary.revenueGoal);

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

  return {
    cal,
    goalProgress: goalProg,
    paceVariance: variance,
    remaining,
    requiredDaily,
    actualDaily,
    overall,
    revenueStatus,
    kpis,
    priorities,
    daily,
  };
}
