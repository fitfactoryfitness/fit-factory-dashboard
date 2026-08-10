import { VacationEntry } from "@/lib/vacations";

// "YYYY-MM-DD" -> "Aug 8" — plain date-string parsing (no Date/timezone
// conversion needed or wanted here; the tracker's dates are already
// timezone-less calendar dates).
function fmtShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function VacationSection({
  label,
  entries,
  error,
  tone,
  dateLabel,
}: {
  label: string;
  entries: VacationEntry[];
  error: string | null;
  tone: "red" | "amber";
  dateLabel: (entry: VacationEntry) => string;
}) {
  const countColor = tone === "red" ? "text-red-400" : "text-amber-400";
  return (
    <div className="min-w-0 min-h-0 flex flex-col">
      <div className="text-slate-500 uppercase text-xs md:text-base tracking-wide truncate">{label}</div>
      {error ? (
        <div className="text-amber-400 text-lg md:text-2xl font-bold truncate" title={error}>
          Unavailable
        </div>
      ) : (
        <div className={`text-3xl md:text-5xl font-bold truncate ${entries.length === 0 ? "text-slate-600" : countColor}`}>
          {entries.length}
        </div>
      )}
      {!error && entries.length > 0 && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1 mt-1">
          {entries.map((e) => (
            <div key={`${e.employeeId}-${e.startDate}`} className="text-sm md:text-lg text-slate-300 truncate">
              <span className="font-semibold text-white">{e.name}</span> <span className="text-slate-500">({e.team})</span> — {dateLabel(e)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VacationsCard({ awayNow, startingSoon, error }: { awayNow: VacationEntry[]; startingSoon: VacationEntry[]; error: string | null }) {
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-2.5 md:p-3 flex flex-col h-full overflow-hidden">
      <span className="text-slate-300 text-sm md:text-base font-semibold uppercase tracking-wide truncate mb-1">Vacations</span>
      <div className="flex-1 min-h-0 grid grid-rows-2 gap-2 py-1">
        <VacationSection label="Away now" entries={awayNow} error={error} tone="red" dateLabel={(e) => `Back ${fmtShortDate(e.endDate)}`} />
        <VacationSection
          label="Starting in less than 7 days"
          entries={startingSoon}
          error={error}
          tone="amber"
          dateLabel={(e) => `${fmtShortDate(e.startDate)}, ${e.durationDays}d`}
        />
      </div>
    </div>
  );
}
