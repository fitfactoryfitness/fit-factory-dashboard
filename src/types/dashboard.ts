// Core normalized domain types for the Fit Factory Downtown dashboard.
// These types are the contract between the parsing/calculation layers and the UI.

export type MetricStatus =
  | "ahead"
  | "on-track"
  | "at-risk"
  | "off-track"
  | "achieved"
  | "unavailable";

export type OverallStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "TARGET_ACHIEVED";

export type DataSource = "spreadsheet" | "fallback" | "manual";

export type MetricTarget = {
  metricId: string;
  source: DataSource;
  value: number;
  sourceReference?: string;
  note?: string;
};

// A resolved metric value carries provenance so the UI/logs can explain
// where a number came from and whether it should be trusted.
export type ResolvedValue<T> = {
  value: T | null;
  raw: string | null;
  resolution: "label" | "fallback" | "unavailable";
  sourceCell?: string;
  warning?: string;
};

export type MonthlySummary = {
  month: string; // three-letter tab name, e.g. "JUL"
  year: number;
  tabName: string;
  usedFallbackTab: boolean;
  fallbackWarning?: string;

  revenueGoal: number | null;
  revenueMTD: number | null;
  projectedRevenue: number | null;
  revenueGap: number | null;
  bookedRevenue: number | null;
  membershipStart: number | null;
  utilizationGoalPct: number | null;
  attritionGoalPct: number | null;

  trialsMTD: number | null;
  trialsTarget: MetricTarget;
  cpToTrialsMTD: number | null;
  cpToTrialsTarget: MetricTarget;

  totalSalesMTD: number | null;
  newMembershipsMTD: number | null;
  newMembershipsTarget: MetricTarget;
  utilizationMTD: number | null;
  terminationsMTD: number | null;
  revenueLostMTD: number | null;
  noVisitLast7MTD: number | null;
  pscMTD: number | null;
  pscRevMTD: number | null;

  // Forward MRR forecast (no spreadsheet label; read from confirmed
  // absolute columns AG/AH/AI — see PSC_TOTALS_FALLBACK/MRR_FORECAST_COLUMNS
  // in config/fallbackCells.ts and dailyTableParser.ts for provenance).
  mrrForecast: { plus1: number | null; plus2: number | null; plus3: number | null };

  // Secondary, non-KPI comparison data. Never mixed into Downtown KPIs.
  midtown?: {
    revenueTarget: number | null;
    revenueMTD: number | null;
    revenueGap: number | null;
    bookedRevenue: number | null;
  };
};

export type DailyPerformance = {
  date: string; // ISO date, America/Toronto business day
  dayOfMonth: number;
  isToday: boolean;
  isComplete: boolean; // false if this is the in-progress "today" row
  grossRevenue: number | null;
  revenueTotal: number | null;
  pretaxRevenue: number | null;
  trials: number | null;
  cpToTrials: number | null;
  booked: number | null;
  show: number | null;
  newMemberships: number | null;
  classPacks: number | null;
  pt: number | null;
  totalSales: number | null;
  utilization: number | null;
  visits: number | null;
  frozen: number | null;
  terminations: number | null;
  revenueLost: number | null;
  noVisitLast7: number | null;
  bookedRevenue: number | null;
};

export type DiagnosticsEntry = {
  metric: string;
  label: string;
  resolvedVia: "label" | "fallback" | "unavailable" | "computed" | "totalsRow" | "dailySum";
  sourceCell?: string;
  warning?: string;
};

export type DashboardPayload = {
  generatedAt: string; // ISO timestamp of when data was normalized
  dataSource: "mock" | "google";
  timezone: string;
  spreadsheetId: string;
  summary: MonthlySummary;
  daily: DailyPerformance[];
  today: DailyPerformance | null;
  diagnostics: DiagnosticsEntry[];
  warnings: string[];
};

export type PrioritySeverity = "critical" | "warning" | "info";

export type PriorityItem = {
  id: string;
  title: string;
  explanation: string;
  action: string;
  severity: PrioritySeverity;
  score: number;
};

export type KpiCardData = {
  id: string;
  label: string;
  currentValue: number | null;
  target: number | null;
  targetSource: DataSource;
  unit: "count" | "currency" | "percent";
  expectedByToday: number | null;
  paceGap: number | null;
  requiredPerRemainingDay: number | null;
  progressPct: number | null;
  status: MetricStatus;
  hasTarget: boolean;
};
