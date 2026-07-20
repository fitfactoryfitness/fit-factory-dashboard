import { SheetGrid } from "@/lib/googleSheets/client";
import { parseSummary } from "./summaryParser";
import { parseDailyTable } from "./dailyTableParser";
import { resolveTarget } from "@/config/targets";
import { DashboardPayload, DiagnosticsEntry, MonthlySummary } from "@/types/dashboard";
import { getCalendarProgress } from "@/lib/calculations/pace";
import { BUSINESS_TIMEZONE } from "@/config/thresholds";

export function buildMonthlySummaryAndDaily(params: {
  grid: SheetGrid;
  tabName: string;
  usedFallbackTab: boolean;
  fallbackWarning?: string;
  now: Date;
}): { summary: MonthlySummary; daily: DashboardPayload["daily"]; diagnostics: DiagnosticsEntry[]; warnings: string[] } {
  const { grid, tabName, usedFallbackTab, fallbackWarning, now } = params;
  const diagnostics: DiagnosticsEntry[] = [];
  const warnings: string[] = [];
  if (fallbackWarning) warnings.push(fallbackWarning);

  const cal = getCalendarProgress(now, BUSINESS_TIMEZONE);
  const fields = parseSummary(grid, diagnostics);

  const { daily, monthlyTotals, mrrForecast } = parseDailyTable(
    grid,
    cal.totalDaysInMonth,
    cal.day,
    (day) => new Date(Date.UTC(cal.year, cal.monthNum - 1, day)).toISOString().slice(0, 10),
    diagnostics,
    warnings
  );

  // STRICT READ-ONLY POLICY: every monthly figure below is read directly
  // from a cell the spreadsheet itself already computed — the TOTALS row
  // (preferred, since it's the sheet's own authoritative monthly figure) or
  // the summary-block label as a fallback. Nothing here is summed, derived,
  // or recalculated client-side. If neither source has a value, the metric
  // is reported as unavailable (null) rather than estimated.
  function readMonthly(field: string, metricName: string): number | null {
    const fromTotals = monthlyTotals?.[field];
    if (typeof fromTotals === "number") {
      diagnostics.push({ metric: metricName, label: field, resolvedVia: "totalsRow" });
      return fromTotals;
    }
    diagnostics.push({
      metric: metricName,
      label: field,
      resolvedVia: "unavailable",
      warning: "No spreadsheet TOTALS row value found for this field, and daily-sum estimation is disabled by design — showing unavailable rather than guessing.",
    });
    return null;
  }

  const trialsMTD = readMonthly("trials", "trialsMTD");
  const cpToTrialsMTD = readMonthly("cpToTrials", "cpToTrialsMTD");
  const newMembershipsMTD = readMonthly("newMemberships", "newMembershipsMTD");
  const terminationsMTD = readMonthly("terminations", "terminationsMTD");
  const revenueLostMTD = readMonthly("revLost", "revenueLostMTD");
  const totalSalesMTD = fields.totalSalesMTD ?? readMonthly("totalSalesCol", "totalSalesMTD");
  const pscMTD = readMonthly("psc", "pscMTD");
  const pscRevMTD = readMonthly("pscRev", "pscRevMTD");

  // Revenue is the PRETAX (FF) column specifically — confirmed against the
  // live sheet (e.g. day 5 = cell H19 = 1,588.01, which is PRETAX, not REV
  // TOTAL). Revenue MTD is read straight from the TOTALS row's PRETAX cell
  // (e.g. H47); if that's not present, fall back to the summary block's own
  // "REVENUE MTD" label — both are values the sheet already computed, never
  // a sum we produce ourselves.
  const revenueMTD = readMonthly("pretax", "revenueMTD") ?? fields.revenueMTD;

  // Utilization MTD: the spreadsheet's own TOTALS/AVERAGE row for this
  // column, read directly — not an average we compute from daily rows.
  const utilizationMTD = readMonthly("utilization", "utilizationMTD");

  // No-visit-last-7 is a running snapshot, not a monthly total — read the
  // most recently entered value directly (a plain lookup, not a calculation).
  const noVisitLast7MTD = (() => {
    for (let i = daily.length - 1; i >= 0; i--) {
      if (typeof daily[i].noVisitLast7 === "number") return daily[i].noVisitLast7 as number;
    }
    return null;
  })();

  const trialsTarget = resolveTarget("trials", null);
  const cpToTrialsTarget = resolveTarget("cpToTrials", null);

  // Projected Revenue (I5:J5) and Gap to Goal (I6:J6) are read directly via
  // label search in parseSummary — not recalculated here.
  const summary: MonthlySummary = {
    month: tabName,
    year: cal.year,
    tabName,
    usedFallbackTab,
    fallbackWarning,
    revenueGoal: fields.revenueGoal,
    revenueMTD,
    projectedRevenue: fields.projectedRevenue,
    revenueGap: fields.revenueGap,
    bookedRevenue: fields.bookedRevenue,
    membershipStart: fields.membershipStart,
    utilizationGoalPct: fields.utilizationGoalPct,
    attritionGoalPct: fields.attritionGoalPct,
    trialsMTD,
    trialsTarget,
    cpToTrialsMTD,
    cpToTrialsTarget,
    totalSalesMTD,
    newMembershipsMTD,
    utilizationMTD,
    terminationsMTD,
    revenueLostMTD,
    noVisitLast7MTD,
    pscMTD,
    pscRevMTD,
    mrrForecast,
    midtown: fields.midtown,
  };

  return { summary, daily, diagnostics, warnings };
}
