// Label alias dictionary used by the spreadsheet parser to resolve metrics
// by normalized text rather than fixed cell coordinates. This directly
// reflects real spelling/label drift observed during spreadsheet discovery
// across TEMPLATE, JUN, and JUL tabs (e.g. "VISTS" typo, "BOOKED" vs
// "APPOINTMENTS", "REFINED (PT)" vs "REFINED REV", "REVENUE GOAL" vs
// "REVENUE TARGET" for Midtown).

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // drop parenthetical qualifiers like "(FF)" / "(PT)"
    .replace(/[^a-z0-9%\s]/g, " ") // strip punctuation/symbols
    .replace(/\s+/g, " ")
    .trim();
}

export const metricAliases: Record<string, string[]> = {
  revenueGoal: ["revenue goal", "revenue target"],
  revenueMTD: ["revenue mtd", "month to date revenue", "mtd revenue"],
  projectedRevenue: ["projected revenue"],
  gapToGoalMonth: ["gap to goal month", "gap to goal"],
  gapToGoalDaily: ["gap to goal daily"],
  bookedRevenue: ["booked revenue"],
  membershipStart: ["membership start"],
  utilizationGoal: ["utilization goal"],
  attritionGoal: ["attrition goal"],
  totalSales: ["total sales", "net new sales"],

  day: ["day"],
  grossRevenue: ["gross revenue"],
  memberships: ["memberships"],
  credits: ["credits"],
  penaltyFees: ["penalty fees"],
  misc: ["misc"],
  revTotal: ["rev total"],
  pretax: ["pretax", "pretax ff"],
  trials: ["trials"],
  cpToTrials: ["cp to trials", "classpass to trials", "class pass to trials"],
  booked: ["booked", "appointments"],
  show: ["show"],
  newMemberships: ["new memberships"],
  classPacks: ["class packs"],
  pt: ["pt"],
  psc: ["psc"],
  pscRev: ["psc rev"],
  deposit: ["deposit"],
  totalSalesCol: ["total sales"],
  refinedRev: ["refined rev", "refined pt"],
  utilization: ["utilization"],
  visits: ["visits", "vists", "check ins"],
  pscVisits: ["psc visits"],
  pscPct: ["psc %", "psc pct"],
  cpVisits: ["cp visits"],
  cpPct: ["cp %", "cp pct"],
  cpRev: ["cp rev"],
  frozen: ["frozen"],
  terminations: ["terminations"],
  revLost: ["rev lost", "revenue lost"],
  noVisitLast7: ["no visit last 7", "no visits last 7"],
  bookedRevCol: ["booked rev"],
  mrr: ["mrr", "next mo mrr pre tax", "next mo mrr"],
};

export function findAliasKey(rawLabel: string): string | null {
  const norm = normalizeLabel(rawLabel);
  for (const [key, aliases] of Object.entries(metricAliases)) {
    if (aliases.some((a) => normalizeLabel(a) === norm)) return key;
  }
  return null;
}
