// Fallback cell coordinates, used ONLY when label-based discovery fails to
// resolve a metric. These are approximations captured from the July 2026
// live sheet during discovery and are NOT assumed to remain valid forever —
// they exist purely as a last resort so the dashboard can still render
// something (with a visible warning) if a tab's labels change unexpectedly.
//
// Row/column indices are 0-based, matching the SheetGrid returned by
// readSheetGrid (grid[row][col]).

export const DOWNTOWN_SUMMARY_FALLBACK = {
  revenueGoal: { row: 2, col: 8, ref: "I3" },
  revenueMTD: { row: 3, col: 8, ref: "I4" },
  projectedRevenue: { row: 4, col: 8, ref: "I5" },
  gapToGoalMonth: { row: 5, col: 8, ref: "I6" },
};

export const DAILY_TABLE_FALLBACK = {
  trialsColumn: { col: 8, ref: "I" }, // approximate, per business brief
  cpToTrialsColumn: { col: 9, ref: "J" }, // approximate, per business brief
  headerRowSearchWindow: 20, // scan first N rows for the detail header row
};

// PSC totals: confirmed directly by the business (P47 = PSC count, Q47 =
// PSC revenue) on the live JUL tab. Used only as a safety-net absolute-
// column read on the TOTALS row that's already been located by label —
// never as a substitute for label matching when that already works.
export const PSC_TOTALS_FALLBACK = {
  pscColumn: { col: 15, ref: "P" },
  pscRevColumn: { col: 16, ref: "Q" },
};

// Forward MRR forecast columns: confirmed directly by the business (AG, AH,
// AI = MRR forecast for the next 1/2/3 months respectively) on the live JUL
// tab. These have no reliable label to match on, so they're read by
// absolute column position rather than label search — the "latest value"
// is the last non-blank cell found in that column across the daily rows,
// the same running-snapshot pattern already used for NO VISIT LAST 7.
export const MRR_FORECAST_COLUMNS = {
  plus1: { col: 32, ref: "AG" },
  plus2: { col: 33, ref: "AH" },
  plus3: { col: 34, ref: "AI" },
};
