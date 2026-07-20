// DEPRECATED / UNUSED: "Today's Focus" was removed from DashboardClient.tsx
// per product feedback. Kept in place rather than deleted (this environment
// can't delete files); safe to delete this file on a normal machine if
// nothing else starts importing it.
import { PriorityItem } from "@/types/dashboard";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  info: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

export function TodaysFocus({ priorities }: { priorities: PriorityItem[] }) {
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-4 flex flex-col gap-2 h-full overflow-hidden">
      <h2 className="text-slate-300 text-base font-bold uppercase tracking-wide shrink-0">Today&apos;s Focus</h2>
      {priorities.length === 0 && (
        <div className="text-slate-400 text-sm">No urgent priorities detected — steady as she goes.</div>
      )}
      <ol className="flex flex-col gap-2 min-h-0 flex-1">
        {priorities.slice(0, 3).map((p, i) => (
          <li key={p.id} className={`rounded-lg border px-3 py-2 flex-1 min-h-0 overflow-hidden ${SEVERITY_STYLES[p.severity]}`}>
            <div className="flex items-start gap-2 h-full">
              <span className="font-black text-lg leading-none shrink-0">{i + 1}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-white text-sm leading-tight truncate">{p.title}</span>
                <span className="text-xs text-slate-300 leading-snug line-clamp-2">{p.explanation}</span>
                <span className="text-xs font-semibold leading-snug line-clamp-1">{p.action}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
