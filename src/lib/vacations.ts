import { resolveEmployee } from "@/config/roster";
import { BUSINESS_TIMEZONE } from "@/config/thresholds";

const TIME_OFF_API_URL = "https://fit-factory-vacation-tracker.vercel.app/api/time-off";

type RawTimeOff = {
  id: string;
  employeeId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  note: string | null;
};

export type VacationEntry = {
  employeeId: string;
  name: string;
  team: string;
  startDate: string;
  endDate: string;
  durationDays: number; // inclusive, e.g. Jul 14 - Aug 8 = 26 days
};

export type VacationsPayload = {
  asOf: string; // ISO date this was computed against, business timezone
  awayNow: VacationEntry[];
  startingSoon: VacationEntry[]; // starts strictly after today, within 7 days
  error: string | null;
};

function businessToday(now: Date): string {
  // "YYYY-MM-DD" in the business timezone, so this lines up with the plain
  // date strings the tracker API returns (no time component, no timezone).
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86_400_000) + 1;
}

// Fetches the vacation tracker's own public JSON endpoint (no auth, no
// Supabase access needed — it's a plain GET this app's server calls
// directly, same "read from the source of truth" approach used for the
// Google Sheet elsewhere in this app). Never guesses at time-off data if
// the fetch fails — returns an explicit error instead of showing stale or
// fabricated entries.
export async function fetchVacations(now: Date = new Date()): Promise<VacationsPayload> {
  const today = businessToday(now);
  const weekOut = addDays(today, 7);

  try {
    const res = await fetch(TIME_OFF_API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Vacation tracker responded ${res.status}`);
    const raw = (await res.json()) as RawTimeOff[];

    const entries: VacationEntry[] = raw.map((r) => {
      const { name, team } = resolveEmployee(r.employeeId);
      return {
        employeeId: r.employeeId,
        name,
        team,
        startDate: r.startDate,
        endDate: r.endDate,
        durationDays: daysBetweenInclusive(r.startDate, r.endDate),
      };
    });

    const awayNow = entries
      .filter((e) => e.startDate <= today && today <= e.endDate)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    const startingSoon = entries
      .filter((e) => e.startDate > today && e.startDate <= weekOut)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    return { asOf: today, awayNow, startingSoon, error: null };
  } catch (err) {
    return { asOf: today, awayNow: [], startingSoon: [], error: err instanceof Error ? err.message : "Failed to load vacation data" };
  }
}
