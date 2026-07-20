import { describe, it, expect } from "vitest";
import { generatePriorities } from "@/lib/priorityEngine";
import { MonthlySummary } from "@/types/dashboard";

function baseSummary(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    month: "JUL",
    year: 2026,
    tabName: "JUL",
    usedFallbackTab: false,
    revenueGoal: 85000,
    revenueMTD: 52785.61,
    projectedRevenue: 77090.61,
    revenueGap: -7909.39,
    bookedRevenue: 24305,
    membershipStart: 262,
    utilizationGoalPct: 70,
    attritionGoalPct: 5,
    trialsMTD: 31,
    trialsTarget: { metricId: "trials", source: "fallback", value: 50 },
    cpToTrialsMTD: 8,
    cpToTrialsTarget: { metricId: "cpToTrials", source: "fallback", value: 30 },
    totalSalesMTD: 53,
    newMembershipsMTD: 12,
    utilizationMTD: 60,
    terminationsMTD: 2,
    revenueLostMTD: 400,
    noVisitLast7MTD: 10,
    pscMTD: 4,
    pscRevMTD: 620,
    mrrForecast: { plus1: null, plus2: null, plus3: null },
    ...overrides,
  };
}

describe("priority engine", () => {
  it("surfaces revenue shortfall as top priority when projection is materially below goal", () => {
    const result = generatePriorities({ summary: baseSummary(), calendarProgress: 0.645, remainingDays: 11 });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe("revenue-shortfall");
    expect(result[0].explanation).toContain("$7,909");
  });

  it("recommends protecting the win when revenue already achieved", () => {
    const result = generatePriorities({
      summary: baseSummary({ revenueMTD: 90000, projectedRevenue: 95000 }),
      calendarProgress: 0.8,
      remainingDays: 5,
    });
    expect(result.some((p) => p.id === "revenue-achieved")).toBe(true);
  });

  it("never fabricates a priority unsupported by the data (e.g. no terminations priority when zero)", () => {
    const result = generatePriorities({
      summary: baseSummary({ terminationsMTD: 0, revenueLostMTD: 0, noVisitLast7MTD: 0 }),
      calendarProgress: 0.645,
      remainingDays: 11,
    });
    expect(result.some((p) => p.id === "terminations")).toBe(false);
    expect(result.some((p) => p.id === "no-visit-7")).toBe(false);
  });

  it("returns at most 3 priorities, ranked by score", () => {
    const result = generatePriorities({ summary: baseSummary({ terminationsMTD: 8, utilizationMTD: 40 }), calendarProgress: 0.645, remainingDays: 11 });
    expect(result.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });
});
