import { BUSINESS_TIMEZONE } from "@/config/thresholds";

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

// Returns the current business-timezone date parts and the elapsed/remaining
// day counts.
//
// "remainingDays" is used for all "need X per remaining day" framing (both
// the revenue hero and the KPI cards). It deliberately EXCLUDES today: today
// is already in progress and largely already reflected in today's partial
// numbers, so the actionable question is "how much more per day for the
// rest of the month." For July 20 in a 31-day month that's 11 days
// (21-31), matching how staff actually plan the rest of the month.
//
// "calendarProgress" (used only for pace-status comparisons, e.g. "are we
// ahead or behind for a date like today") separately credits today as
// half-elapsed, since it's a statistical "how far through the month" measure
// rather than an operational planning count.
export function getCalendarProgress(now: Date, timeZone: string = BUSINESS_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const monthNum = Number(parts.find((p) => p.type === "month")?.value); // 1-12
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const total = daysInMonth(year, monthNum - 1);

  const elapsedDaysExcludingToday = day - 1;
  const remainingDaysExcludingToday = total - day;
  const calendarProgress = Math.min(1, (elapsedDaysExcludingToday + 0.5) / total);

  return {
    year,
    monthNum,
    day,
    totalDaysInMonth: total,
    elapsedDays: elapsedDaysExcludingToday,
    remainingDays: Math.max(remainingDaysExcludingToday, 0),
    calendarProgress,
  };
}

export function safeDivide(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

export function goalProgress(revenueMTD: number | null, revenueGoal: number | null): number | null {
  return safeDivide(revenueMTD, revenueGoal);
}

export function paceVariance(goalProg: number | null, calendarProg: number): number | null {
  if (goalProg === null) return null;
  return goalProg - calendarProg;
}

export function remainingAmount(goal: number | null, mtd: number | null): number | null {
  if (goal === null || mtd === null) return null;
  return Math.max(goal - mtd, 0);
}

export function requiredPerRemainingDay(remaining: number | null, remainingDays: number): number | null {
  if (remaining === null || remainingDays <= 0) return remaining !== null && remaining > 0 ? null : 0;
  return remaining / remainingDays;
}

export function actualAverageDaily(mtd: number | null, elapsedDaysIncludingToday: number): number | null {
  if (mtd === null || elapsedDaysIncludingToday <= 0) return null;
  return mtd / elapsedDaysIncludingToday;
}

export function expectedByToday(target: number | null, calendarProg: number): number | null {
  if (target === null) return null;
  return target * calendarProg;
}

export function paceGap(current: number | null, expected: number | null): number | null {
  if (current === null || expected === null) return null;
  return current - expected;
}

export function sevenDayAverage(values: (number | null)[]): number | null {
  const recent = values.slice(-7).filter((v): v is number => v !== null);
  if (recent.length === 0) return null;
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}
