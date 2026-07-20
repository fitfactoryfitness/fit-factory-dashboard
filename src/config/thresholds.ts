// Configurable business-logic thresholds. Keeping these in one file makes it
// easy to tune status behavior without touching calculation/UI code.

export const REVENUE_STATUS_THRESHOLDS = {
  achievedPctOfGoal: 1.0, // Revenue MTD >= goal => TARGET ACHIEVED
  onTrackProjectedPctOfGoal: 1.0, // projected >= 100% of goal => ON TRACK
  atRiskProjectedPctOfGoal: 0.9, // projected in [90%, 100%) => AT RISK, below => OFF TRACK
};

export const KPI_PACE_THRESHOLDS = {
  // current progress vs expected-by-today progress, in percentage points
  greenAtOrAboveExpected: true,
  amberWithinPoints: 10, // within 10 points below expected => amber
  // more than amberWithinPoints below expected => red
};

// Leading-indicator downgrade rule: if revenue looks ON_TRACK but trials and
// CP-to-Trials are both severely behind pace, downgrade the overall status
// to AT_RISK. "Severely behind" = pace gap below this fraction of expected.
export const LEADING_INDICATOR_DOWNGRADE = {
  severePaceGapFraction: 0.4, // current value < 60% of expected-by-today value
  requireBothMetrics: true,
};

// Intraday "Today so far" evaluation windows (business timezone hours).
// Before neutralUntilHour: always neutral regardless of data (day just started).
// Between neutralUntilHour and strongEvalHour: soft comparison to a fraction of daily pace.
// After strongEvalHour: full comparison to daily pace.
export const INTRADAY_THRESHOLDS = {
  neutralUntilHour: 10, // before 10:00 AM
  softEvalUntilHour: 16, // 10:00 AM - 4:00 PM
  softEvalPaceFraction: 0.5, // expect ~50% of daily pace produced by early afternoon
  // after 16:00 (4:00 PM), compare against 100% of the daily pace expectation
};

// Data freshness thresholds (minutes) for the refresh/staleness indicator.
export const FRESHNESS_THRESHOLDS_MINUTES = {
  freshUntil: 10,
  staleUntil: 30,
  // beyond staleUntil => "critical"
};

// Google Sheets has no push/webhook mechanism for cell edits reachable from
// a plain read-only service account — the only way to reflect a live edit
// "instantly" without adding separate push infrastructure (an Apps Script
// onEdit trigger calling out to a public webhook endpoint, held open via
// SSE/WebSocket) is to poll frequently. 15s is indistinguishable from
// instant on a TV that nobody is refreshing by hand, and well inside Google
// Sheets API read-quota limits (100 requests/100s/user by default).
export const AUTO_REFRESH_INTERVAL_MS = 15 * 1000;

export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || "America/Toronto";
