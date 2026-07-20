import { INTRADAY_THRESHOLDS, BUSINESS_TIMEZONE } from "@/config/thresholds";

export type TodayEvalStatus = "neutral" | "good" | "needs-attention";

export function currentHour(now: Date, timeZone: string = BUSINESS_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).formatToParts(now);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

// Time-aware intraday evaluation. Before neutralUntilHour, always neutral —
// too early to judge a day that's barely started. Between neutralUntilHour
// and softEvalUntilHour, compare against a fraction of the expected daily
// pace. After softEvalUntilHour, compare against the full expected pace.
export function evaluateTodaySoFar(
  todayRevenue: number | null,
  requiredDailyRevenue: number | null,
  now: Date,
  timeZone: string = BUSINESS_TIMEZONE
): { status: TodayEvalStatus; reason: string } {
  const hour = currentHour(now, timeZone);

  if (hour < INTRADAY_THRESHOLDS.neutralUntilHour) {
    return { status: "neutral", reason: "Before 10:00 AM — too early in the business day to evaluate." };
  }

  if (todayRevenue === null) {
    return { status: "neutral", reason: "Today's revenue has not been entered yet." };
  }

  if (requiredDailyRevenue === null || requiredDailyRevenue <= 0) {
    return { status: "neutral", reason: "No daily revenue target available for comparison." };
  }

  if (hour < INTRADAY_THRESHOLDS.softEvalUntilHour) {
    const expectedSoFar = requiredDailyRevenue * INTRADAY_THRESHOLDS.softEvalPaceFraction;
    return todayRevenue >= expectedSoFar
      ? { status: "good", reason: "On pace for the required daily revenue given the time of day." }
      : { status: "needs-attention", reason: "Behind the expected mid-day pace for today's revenue target." };
  }

  return todayRevenue >= requiredDailyRevenue
    ? { status: "good", reason: "Met or exceeded today's required revenue pace." }
    : { status: "needs-attention", reason: "Below today's required revenue pace." };
}
