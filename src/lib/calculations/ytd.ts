import { MonthlySummary } from "@/types/dashboard";

export type YtdSummary = {
  monthsIncluded: string[];
  revenueMTD: number | null;
  trialsMTD: number | null;
  cpToTrialsMTD: number | null;
  newMembershipsMTD: number | null;
  totalSalesMTD: number | null;
  terminationsMTD: number | null;
  revenueLostMTD: number | null;
  pscMTD: number | null;
  pscRevMTD: number | null;
  // Percentage, not additive — see note below. Kept separate from the
  // summed fields above so nothing implies it was derived the same way.
  utilizationAvgPct: number | null;
  warnings: string[];
};

const SUMMABLE_FIELDS = [
  "revenueMTD",
  "trialsMTD",
  "cpToTrialsMTD",
  "newMembershipsMTD",
  "totalSalesMTD",
  "terminationsMTD",
  "revenueLostMTD",
  "pscMTD",
  "pscRevMTD",
] as const;

type SummableField = (typeof SUMMABLE_FIELDS)[number];

// EXPLICIT, DELIBERATE EXCEPTION to this app's otherwise strict "never sum/
// derive a figure client-side" policy (see README, "Strict read-only policy
// for monthly figures"). Confirmed during this feature's build (2026-07-26):
// no YTD/annual rollup cell exists anywhere in the workbook, so unlike every
// other number in this app, Year-to-Date here is computed by summing each
// individual month's own already-computed TOTALS-row figure — never summing
// raw daily rows. Each value going into this sum is itself a direct, trusted
// per-month read; only the addition across months is new. If a genuine YTD
// source cell is ever added to the workbook (e.g. on the ANNUAL tab), prefer
// reading it directly and retire this function.
//
// Null handling: if ANY included month is missing a given field, that
// field's YTD total is reported as null rather than silently treating the
// missing month as zero (which would understate the true total) — same
// "unavailable rather than guessed" philosophy used everywhere else.
export function sumYtd(monthlySummaries: { tabName: string; summary: MonthlySummary }[]): YtdSummary {
  const warnings: string[] = [];
  const totals = {} as Record<SummableField, number | null>;

  for (const field of SUMMABLE_FIELDS) {
    let runningTotal = 0;
    let anyMissing = false;
    for (const { tabName, summary } of monthlySummaries) {
      const value = summary[field];
      if (value === null) {
        anyMissing = true;
        warnings.push(`${tabName} is missing ${field}; YTD ${field} is reported unavailable rather than understated.`);
        continue;
      }
      runningTotal += value;
    }
    totals[field] = anyMissing ? null : runningTotal;
  }

  // Simple (unweighted) mean across the included months' own already-
  // computed monthly averages — a true weighted-by-visits average isn't
  // derivable from what this app reads, so this is clearly an approximation,
  // surfaced as "avg," never presented with the same confidence as the
  // summed fields above.
  const utilValues = monthlySummaries.map((m) => m.summary.utilizationMTD).filter((v): v is number => v !== null);
  const utilizationAvgPct = utilValues.length > 0 ? utilValues.reduce((a, b) => a + b, 0) / utilValues.length : null;
  if (utilValues.length > 0 && utilValues.length < monthlySummaries.length) {
    warnings.push("One or more months are missing Utilization; YTD Utilization avg only reflects the months that had it.");
  }

  return {
    monthsIncluded: monthlySummaries.map((m) => m.tabName),
    ...totals,
    utilizationAvgPct,
    warnings,
  };
}
