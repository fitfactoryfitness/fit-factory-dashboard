import { describe, it, expect } from "vitest";
import {
  goalProgress,
  paceVariance,
  remainingAmount,
  requiredPerRemainingDay,
  expectedByToday,
  paceGap,
  safeDivide,
  daysInMonth,
  getCalendarProgress,
} from "@/lib/calculations/pace";

describe("revenue + count pace calculations", () => {
  it("computes goal progress safely, including zero-goal edge case", () => {
    expect(goalProgress(52785.61, 85000)).toBeCloseTo(0.621, 2);
    expect(goalProgress(100, 0)).toBeNull();
    expect(goalProgress(null, 85000)).toBeNull();
  });

  it("computes pace variance (goal progress vs calendar progress)", () => {
    expect(paceVariance(0.621, 0.645)).toBeCloseTo(-0.024, 2);
    expect(paceVariance(null, 0.5)).toBeNull();
  });

  it("never returns negative remaining amount when goal already exceeded", () => {
    expect(remainingAmount(85000, 90000)).toBe(0);
    expect(remainingAmount(85000, 50000)).toBe(35000);
  });

  it("handles zero remaining days without dividing by zero", () => {
    expect(requiredPerRemainingDay(1000, 0)).toBeNull();
    expect(requiredPerRemainingDay(0, 0)).toBe(0);
  });

  it("computes expected-by-today and pace gap for count metrics (trials example)", () => {
    const expected = expectedByToday(50, 0.645);
    expect(expected).toBeCloseTo(32.25, 1);
    expect(paceGap(31, expected)).toBeCloseTo(-1.25, 1);
  });

  it("safeDivide guards against zero/undefined denominators", () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(safeDivide(null, 5)).toBeNull();
    expect(safeDivide(10, 5)).toBe(2);
  });

  it("computes correct days-in-month across a leap and non-leap February", () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2026, 6)).toBe(31);
  });

  it("remainingDays excludes today (July 20 in a 31-day month leaves 11 remaining days, not 12)", () => {
    const cal = getCalendarProgress(new Date(Date.UTC(2026, 6, 20, 16)), "America/Toronto");
    expect(cal.day).toBe(20);
    expect(cal.totalDaysInMonth).toBe(31);
    expect(cal.remainingDays).toBe(11);
  });

  it("required-per-day must be ceiled for display, not rounded to nearest, or it can imply a rate that undershoots the target", () => {
    // 17 needed over 12 remaining days = 1.4167/day. Rounding to nearest
    // gives 1 ("Need 1/day"), which only reaches 33 + 1*12 = 45 by month
    // end — short of the 50 target despite "hitting" the displayed rate
    // every day. Ceiling gives 2, which safely reaches 33 + 2*12 = 57.
    const perDay = requiredPerRemainingDay(17, 12)!;
    expect(Math.round(perDay)).toBe(1);
    expect(33 + Math.round(perDay) * 12).toBeLessThan(50); // rounding would mislead
    expect(Math.ceil(perDay)).toBe(2);
    expect(33 + Math.ceil(perDay) * 12).toBeGreaterThanOrEqual(50); // ceiling is safe
  });
});
