import { VacationEntry } from "@/lib/vacations";

// "YYYY-MM-DD" -> "Aug 8" — plain date-string parsing (no Date/timezone
// conversion needed or wanted here; the tracker's dates are already
// timezone-less calendar dates).
function fmtShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function VacationPill({ entry, tone, dateLabel }: { entry: VacationEntry; tone: "red" | "amber"; dateLabel: string }) {
  const colors = tone === "red" ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-amber-500/10 border-amber-500/30 text-amber-300";
  return (
    <span className={`px-2 py-0.5 rounded border text-xs md:text-sm whitespace-nowrap ${colors}`}>
      <span className="font-semibold">{entry.name}</span> <span className="opacity-70">({entry.team})</span> — {dateLabel}
    </span>
  );
}

export function VacationsCard({ awayNow, startingSoon, error }: { awayNow: VacationEntry[]; startingSoon: VacationEntry[]; error: string | null }) {
  return (
    <div className="flex items-center flex-wrap gap-x-6 gap-y-2 px-4 md:px-5 py-3 md:py-2 rounded-xl border border-bg-border bg-bg-panel text-sm md:text-base text-slate-400 w-full overflow-hidden">
      <span className="font-bold text-slate-300 uppercase text-sm tracking-wide shrink-0">Vacations</span>

      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="text-xs uppercase text-slate-500 shrink-0">Away now</span>
        {error ? (
          <span className="text-amber-400 text-xs" title={error}>
            Unavailable
          </span>
        ) : awayNow.length === 0 ? (
          <span className="text-slate-600 text-xs">Nobody</span>
        ) : (
          awayNow.map((e) => <VacationPill key={`${e.employeeId}-${e.startDate}`} entry={e} tone="red" dateLabel={`back ${fmtShortDate(e.endDate)}`} />)
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="text-xs uppercase text-slate-500 shrink-0">Starting in 7 days</span>
        {error ? (
          <span className="text-slate-700 text-xs">—</span>
        ) : startingSoon.length === 0 ? (
          <span className="text-slate-600 text-xs">None</span>
        ) : (
          startingSoon.map((e) => (
            <VacationPill key={`${e.employeeId}-${e.startDate}`} entry={e} tone="amber" dateLabel={`${fmtShortDate(e.startDate)}, ${e.durationDays}d`} />
          ))
        )}
      </div>
    </div>
  );
}
