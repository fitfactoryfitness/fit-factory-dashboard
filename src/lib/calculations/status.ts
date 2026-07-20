import { MetricStatus, OverallStatus } from "@/types/dashboard";
import { REVENUE_STATUS_THRESHOLDS, KPI_PACE_THRESHOLDS, LEADING_INDICATOR_DOWNGRADE } from "@/config/thresholds";

// Overall monthly status. Documented logic (see thresholds.ts for tunables):
//   TARGET ACHIEVED : revenueMTD >= revenueGoal
//   ON_TRACK        : projectedRevenue >= revenueGoal * onTrackProjectedPctOfGoal
//   AT_RISK         : projectedRevenue in [goal * atRiskPct, goal * onTrackPct)
//   OFF_TRACK       : projectedRevenue < revenueGoal * atRiskProjectedPctOfGoal
// Downgrade rule: if ON_TRACK but both trials and CP-to-trials are severely
// behind pace (current < severePaceGapFraction * expectedByToday for both),
// downgrade to AT_RISK — a revenue lead can evaporate next month without
// enough new prospects in the pipeline.
export function computeOverallStatus(params: {
  revenueGoal: number | null;
  revenueMTD: number | null;
  projectedRevenue: number | null;
  trialsCurrent: number | null;
  trialsExpectedByToday: number | null;
  cpCurrent: number | null;
  cpExpectedByToday: number | null;
}): { status: OverallStatus; reason: string } {
  const { revenueGoal, revenueMTD, projectedRevenue, trialsCurrent, trialsExpectedByToday, cpCurrent, cpExpectedByToday } = params;

  if (revenueGoal === null || revenueGoal <= 0) {
    return { status: "AT_RISK", reason: "Revenue goal unavailable; defaulting to AT RISK pending data." };
  }
  if (revenueMTD !== null && revenueMTD >= revenueGoal) {
    return { status: "TARGET_ACHIEVED", reason: "Revenue MTD has reached or exceeded the monthly goal." };
  }
  if (projectedRevenue === null) {
    return { status: "AT_RISK", reason: "Projected revenue unavailable; defaulting to AT RISK pending data." };
  }

  const pctOfGoal = projectedRevenue / revenueGoal;

  if (pctOfGoal < REVENUE_STATUS_THRESHOLDS.atRiskProjectedPctOfGoal) {
    return { status: "OFF_TRACK", reason: `Projected revenue is ${(pctOfGoal * 100).toFixed(1)}% of goal, below the 90% off-track threshold.` };
  }

  if (pctOfGoal < REVENUE_STATUS_THRESHOLDS.onTrackProjectedPctOfGoal) {
    return { status: "AT_RISK", reason: `Projected revenue is ${(pctOfGoal * 100).toFixed(1)}% of goal, between 90-99.99%.` };
  }

  // Revenue looks ON_TRACK. Check the leading-indicator downgrade rule.
  const trialsSevere =
    trialsCurrent !== null && trialsExpectedByToday !== null && trialsExpectedByToday > 0
      ? trialsCurrent < trialsExpectedByToday * LEADING_INDICATOR_DOWNGRADE.severePaceGapFraction
      : false;
  const cpSevere =
    cpCurrent !== null && cpExpectedByToday !== null && cpExpectedByToday > 0
      ? cpCurrent < cpExpectedByToday * LEADING_INDICATOR_DOWNGRADE.severePaceGapFraction
      : false;

  if (LEADING_INDICATOR_DOWNGRADE.requireBothMetrics ? trialsSevere && cpSevere : trialsSevere || cpSevere) {
    return {
      status: "AT_RISK",
      reason: "Revenue pacing is on track, but Trials and CP-to-Trials are both severely behind pace — downgraded from ON TRACK.",
    };
  }

  return { status: "ON_TRACK", reason: `Projected revenue is ${(pctOfGoal * 100).toFixed(1)}% of goal.` };
}

// Pace-adjusted KPI status: compares current progress to expected-by-today
// progress, not raw percent-to-target. Being at 62% of a target that's only
// 40% "due" by today is ahead of pace, not behind.
export function computeKpiStatus(current: number | null, expectedByToday: number | null): MetricStatus {
  if (current === null || expectedByToday === null) return "unavailable";
  if (expectedByToday <= 0) return current > 0 ? "ahead" : "on-track";
  const gapPoints = ((current - expectedByToday) / expectedByToday) * 100;
  if (current >= expectedByToday) return "ahead";
  if (gapPoints >= -KPI_PACE_THRESHOLDS.amberWithinPoints) return "at-risk";
  return "off-track";
}

export function computeProjectedRevenueStatus(projectedRevenue: number | null, revenueGoal: number | null): MetricStatus {
  if (projectedRevenue === null || revenueGoal === null || revenueGoal <= 0) return "unavailable";
  if (projectedRevenue >= revenueGoal) return "ahead";
  if (projectedRevenue >= revenueGoal * REVENUE_STATUS_THRESHOLDS.atRiskProjectedPctOfGoal) return "at-risk";
  return "off-track";
}
