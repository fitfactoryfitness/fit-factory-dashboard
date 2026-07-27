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
  // Names of fields where at least one included month had no data for that
  // field, so the total only reflects the months that did (see "Null
  // handling" below) — the UI uses this to label those specific numbers as
  // partial rather than implying they cover the whole included range.
  partialFields: string[];
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
// Null handling: a field is summed across whichever included months
// actually have it — a month with no CP-to-Trials column at all (real gap,
// confirmed in earlier months' sheets per MAPPING_REPORT) doesn't blank out
// the whole YTD figure, it's just excluded from that one field's total. If
// NO included month has the field, the total is null (nothing to sum).
// Fields missing at least one month are named in `partialFields` so the UI
// can flag them as partial rather than presenting them as a complete total
// across every included month, the same way utilizationAvgPct below is
// flagged as an average rather than implied to be as authoritative as a
// full sum.
export function sumYtd(monthlySummaries: { tabName: string; summary: MonthlySummary }[]): YtdSummary {
  const warnings: string[] = [];
  const partialFields: string[] = [];
  const totals = {} as Record<SummableField, number | null>;

  for (const field of SUMMABLE_FIELDS) {
    let runningTotal = 0;
    let anyMissing = false;
    let anyPresent = false;
    for (const { tabName, summary } of monthlySummaries) {
      const value = summary[field];
      if (value === null) {
        anyMissing = true;
        warnings.push(`${tabName} is missing ${field}; excluded from that field's YTD total.`);
        continue;
      }
      anyPresent = true;
      runningTotal += value;
    }
    if (anyMissing && anyPresent) partialFields.push(field);
    totals[field] = anyPresent ? runningTotal : null;
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
    partialFields,
    warnings,
  };
}
