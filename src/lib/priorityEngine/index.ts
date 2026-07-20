import { PriorityItem, MonthlySummary } from "@/types/dashboard";
import { expectedByToday, paceGap, requiredPerRemainingDay } from "@/lib/calculations/pace";

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function round(n: number): number {
  return Math.round(n);
}

export type PriorityInputs = {
  summary: MonthlySummary;
  calendarProgress: number;
  remainingDays: number;
};

// Deterministic, rules-based priority generation. Every recommendation is
// derived directly from a spreadsheet-backed number — nothing here is
// invented. Rules are additive; each contributes a score, and the top three
// by score are surfaced. severity * businessImpact * urgency, simplified to
// a single numeric score per rule tuned by observed magnitude.
export function generatePriorities({ summary, calendarProgress, remainingDays }: PriorityInputs): PriorityItem[] {
  const items: PriorityItem[] = [];

  const { revenueGoal, revenueMTD, projectedRevenue, trialsMTD, trialsTarget, cpToTrialsMTD, cpToTrialsTarget, utilizationMTD, utilizationGoalPct, terminationsMTD, revenueLostMTD, noVisitLast7MTD } = summary;

  // Revenue shortfall — biggest lever, weighted heaviest.
  if (revenueGoal && projectedRevenue !== null) {
    const shortfall = revenueGoal - projectedRevenue;
    if (shortfall > 0) {
      const pctShort = shortfall / revenueGoal;
      items.push({
        id: "revenue-shortfall",
        title: "Close the revenue gap",
        explanation: `Projected month-end revenue is ${fmtCurrency(shortfall)} below the ${fmtCurrency(revenueGoal)} goal (${(pctShort * 100).toFixed(1)}% short).`,
        action: "Prioritize membership and class-pack follow-ups and push trial conversions for the rest of the month.",
        severity: pctShort >= 0.1 ? "critical" : "warning",
        // Revenue is the primary lever per the business brief, weighted
        // heaviest so a material shortfall outranks secondary lead-gen gaps.
        score: pctShort * 100 * 6,
      });
    } else if (revenueMTD !== null && revenueGoal && revenueMTD >= revenueGoal) {
      items.push({
        id: "revenue-achieved",
        title: "Protect the win and build next month's pipeline",
        explanation: `Revenue MTD (${fmtCurrency(revenueMTD)}) has already reached the ${fmtCurrency(revenueGoal)} goal.`,
        action: "Shift focus to retention and start generating trials/CP conversions for next month.",
        severity: "info",
        score: 20,
      });
    }
  }

  // Trials pace gap
  const trialsExpected = expectedByToday(trialsTarget.value, calendarProgress);
  const trialsGap = paceGap(trialsMTD, trialsExpected);
  if (trialsGap !== null && trialsGap < 0 && remainingDays > 0) {
    const perDay = requiredPerRemainingDay(trialsTarget.value - (trialsMTD ?? 0), remainingDays);
    items.push({
      id: "trials-behind",
      title: "Generate more trials",
      explanation: `Trials are ${round(Math.abs(trialsGap))} behind the expected pace for today (${round(trialsExpected ?? 0)} expected, ${trialsMTD ?? 0} booked).`,
      action: `Book at least ${perDay ? Math.ceil(perDay) : "more"} trials per remaining day to hit the monthly target of ${trialsTarget.value}.`,
      severity: Math.abs(trialsGap) >= 8 ? "critical" : "warning",
      score: Math.abs(trialsGap) * 4,
    });
  }

  // CP-to-Trials pace gap
  const cpExpected = expectedByToday(cpToTrialsTarget.value, calendarProgress);
  const cpGap = paceGap(cpToTrialsMTD, cpExpected);
  if (cpGap !== null && cpGap < 0) {
    items.push({
      id: "cp-to-trials-behind",
      title: "Convert ClassPass visitors",
      explanation: `CP-to-Trials is ${round(Math.abs(cpGap))} behind monthly pace (${round(cpExpected ?? 0)} expected, ${cpToTrialsMTD ?? 0} actual).`,
      action: "Contact recent ClassPass visitors directly and promote the trial offer at check-in.",
      severity: Math.abs(cpGap) >= 5 ? "critical" : "warning",
      score: Math.abs(cpGap) * 3.5,
    });
  }

  // Utilization
  if (utilizationMTD !== null && utilizationGoalPct !== null && utilizationMTD < utilizationGoalPct) {
    const gapPts = utilizationGoalPct - utilizationMTD;
    items.push({
      id: "utilization-low",
      title: "Fill underbooked classes",
      explanation: `Utilization is ${utilizationMTD.toFixed(0)}%, ${gapPts.toFixed(0)} points below the ${utilizationGoalPct.toFixed(0)}% goal.`,
      action: "Focus outreach on underfilled class times today; consider a same-day booking push.",
      severity: gapPts >= 15 ? "critical" : "warning",
      score: gapPts * 2,
    });
  }

  // Terminations / at-risk members
  if (terminationsMTD !== null && terminationsMTD > 0) {
    items.push({
      id: "terminations",
      title: "Review at-risk members",
      explanation: `${terminationsMTD} termination${terminationsMTD === 1 ? "" : "s"} recorded this month${revenueLostMTD ? ` (${fmtCurrency(revenueLostMTD)} in lost revenue)` : ""}.`,
      action: "Review at-risk member list and schedule retention outreach before next billing cycle.",
      severity: terminationsMTD >= 5 ? "critical" : "warning",
      score: terminationsMTD * 3 + (revenueLostMTD ? revenueLostMTD / 200 : 0),
    });
  }

  // No-visit-last-7 as an early churn signal.
  if (noVisitLast7MTD !== null && noVisitLast7MTD > 0) {
    items.push({
      id: "no-visit-7",
      title: "Re-engage inactive members",
      explanation: `${noVisitLast7MTD} member${noVisitLast7MTD === 1 ? "" : "s"} have not visited in the last 7 days.`,
      action: "Send a check-in message or call to members with no recent visits to head off cancellations.",
      severity: noVisitLast7MTD >= 15 ? "warning" : "info",
      score: noVisitLast7MTD * 1.5,
    });
  }

  return items.sort((a, b) => b.score - a.score).slice(0, 3);
}
