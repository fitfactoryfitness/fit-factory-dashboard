// DEPRECATED / UNUSED: removed from the dashboard per product decision — the
// "Today So Far" card was found confusing on the TV display and was
// removed. Left here only because this sandbox's filesystem doesn't allow
// deleting files; it is not imported anywhere. Safe to delete this file
// entirely on a normal machine.
import { DailyPerformance } from "@/types/dashboard";
import { fmtCurrency, fmtNumber, fmtPercent } from "@/lib/format";

const EVAL_STYLES: Record<string, { label: string; cls: string }> = {
  good: { label: "GOOD DAY", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  "needs-attention": { label: "NEEDS ATTENTION", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  neutral: { label: "TOO EARLY TO TELL", cls: "bg-slate-500/15 text-slate-300 border-slate-500/40" },
};

function cell(value: number | null, isComplete: boolean, fmt: (n: number | null) => string) {
  if (value === null) return isComplete ? "0" : "—";
  return fmt(value);
}

export function TodayPanel({
  today,
  requiredDaily,
  evalStatus,
  evalReason,
}: {
  today: DailyPerformance | null;
  requiredDaily: number | null;
  evalStatus: string;
  evalReason: string;
}) {
  const meta = EVAL_STYLES[evalStatus] ?? EVAL_STYLES.neutral;
  const isComplete = today?.isComplete ?? false;

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-4 flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-slate-300 text-base font-bold uppercase tracking-wide truncate">Today So Far</h2>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${meta.cls}`}>{meta.label}</span>
      </div>
      {!today ? (
        <div className="text-slate-400 text-sm">No data recorded yet for today.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm min-h-0">
          <Row label="Revenue" value={cell(today.revenueTotal ?? today.grossRevenue, isComplete, fmtCurrency)} />
          <Row label="Required pace" value={fmtCurrency(requiredDaily)} />
          <Row label="Trials" value={cell(today.trials, isComplete, (n) => fmtNumber(n))} />
          <Row label="CP to Trials" value={cell(today.cpToTrials, isComplete, (n) => fmtNumber(n))} />
          <Row label="New Memberships" value={cell(today.newMemberships, isComplete, (n) => fmtNumber(n))} />
          <Row label="Total Sales" value={cell(today.totalSales, isComplete, (n) => fmtNumber(n))} />
          <Row label="Utilization" value={cell(today.utilization, isComplete, fmtPercent)} />
        </div>
      )}
      <div className="text-xs text-slate-500 mt-auto pt-1">{evalReason}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
