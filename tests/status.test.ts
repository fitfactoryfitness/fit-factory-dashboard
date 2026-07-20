import { describe, it, expect } from "vitest";
import { computeOverallStatus, computeKpiStatus, computeProjectedRevenueStatus } from "@/lib/calculations/status";

describe("overall + KPI status thresholds", () => {
  it("returns TARGET_ACHIEVED when revenue MTD meets or exceeds the goal", () => {
    const r = computeOverallStatus({
      revenueGoal: 85000,
      revenueMTD: 90000,
      projectedRevenue: 95000,
      trialsCurrent: 10,
      trialsExpectedByToday: 30,
      cpCurrent: 5,
      cpExpectedByToday: 20,
    });
    expect(r.status).toBe("TARGET_ACHIEVED");
  });

  it("returns ON_TRACK when projected revenue meets goal and leading indicators are fine", () => {
    const r = computeOverallStatus({
      revenueGoal: 85000,
      revenueMTD: 50000,
      projectedRevenue: 86000,
      trialsCurrent: 30,
      trialsExpectedByToday: 32,
      cpCurrent: 18,
      cpExpectedByToday: 19,
    });
    expect(r.status).toBe("ON_TRACK");
  });

  it("downgrades ON_TRACK to AT_RISK when both trials and CP-to-trials are severely behind", () => {
    const r = computeOverallStatus({
      revenueGoal: 85000,
      revenueMTD: 50000,
      projectedRevenue: 86000,
      trialsCurrent: 5,
      trialsExpectedByToday: 32, // way under 40% of expected
      cpCurrent: 2,
      cpExpectedByToday: 19,
    });
    expect(r.status).toBe("AT_RISK");
  });

  it("returns AT_RISK for projected revenue between 90-99.99% of goal", () => {
    const r = computeOverallStatus({
      revenueGoal: 100000,
      revenueMTD: 50000,
      projectedRevenue: 95000,
      trialsCurrent: null,
      trialsExpectedByToday: null,
      cpCurrent: null,
      cpExpectedByToday: null,
    });
    expect(r.status).toBe("AT_RISK");
  });

  it("returns OFF_TRACK when projected revenue is below 90% of goal", () => {
    const r = computeOverallStatus({
      revenueGoal: 100000,
      revenueMTD: 40000,
      projectedRevenue: 80000,
      trialsCurrent: null,
      trialsExpectedByToday: null,
      cpCurrent: null,
      cpExpectedByToday: null,
    });
    expect(r.status).toBe("OFF_TRACK");
  });

  it("KPI status is pace-adjusted, not raw percent-to-target", () => {
    // 62% of target, but only 40% of month elapsed => ahead of pace
    expect(computeKpiStatus(31, 20)).toBe("ahead");
    // behind expected by more than 10 points => off-track
    expect(computeKpiStatus(10, 30)).toBe("off-track");
    // within 10 points (here exactly 10) => at-risk
    expect(computeKpiStatus(27, 30)).toBe("at-risk");
  });

  it("computeProjectedRevenueStatus follows the documented thresholds", () => {
    expect(computeProjectedRevenueStatus(90000, 85000)).toBe("ahead");
    expect(computeProjectedRevenueStatus(78000, 85000)).toBe("at-risk"); // 91.8%
    expect(computeProjectedRevenueStatus(70000, 85000)).toBe("off-track"); // 82%
    expect(computeProjectedRevenueStatus(null, 85000)).toBe("unavailable");
  });
});
