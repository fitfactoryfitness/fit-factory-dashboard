import { fmtCurrency, fmtNumber, fmtSigned } from "@/lib/format";
import { DataSource, MetricStatus } from "@/types/dashboard";
import { ProgressBar } from "./ProgressBar";

// PSC's count now has a monthly pace target (10/month, business rule — no
// spreadsheet cell defines it, same situation Trials/CP-to-Trials/New
// Memberships were in before their fallback targets were set). Revenue stays
// a plain pass-through display (TOTALS-row Q47) since there's no revenue
// target to pace against. All pace math (progressPct/expectedByToday/status)
// is computed once in viewModel.ts via the shared kpi() helper, not
// duplicated here.
export function PscCard({
  psc,
  pscRev,
  target,
  targetSource,
  progressPct,
  expectedByToday,
  status,
  paceGap,
}: {
  psc: number | null;
  pscRev: number | null;
  target: number | null;
  targetSource: DataSource;
  progressPct: number | null;
  expectedByToday: number | null;
  status: MetricStatus;
  paceGap: number | null;
}) {
  const hasData = psc !== null || pscRev !== null;
  const hasTarget = target !== null && target > 0;
  const expectedPct = hasTarget && expectedByToday !== null ? (expectedByToday / (target as number)) * 100 : null;

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-2 md:p-2.5 flex flex-col gap-1 md:gap-1.5 h-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-300 text-sm md:text-base font-semibold uppercase tracking-wide truncate">PSC</span>
        {!hasData && (
          <span className="shrink-0 text-xs md:text-sm font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded bg-slate-500/15 text-slate-400 whitespace-nowrap">
            — NO DATA
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <div className="text-2xl md:text-4xl font-extrabold text-white leading-none truncate">{fmtNumber(psc)}</div>
            {hasTarget && <span className="text-sm md:text-base text-slate-400 font-medium shrink-0">/ {fmtNumber(target)}</span>}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Count</div>
        </div>
        <div className="min-w-0">
          <div className="text-2xl md:text-4xl font-extrabold text-emerald-400 leading-none truncate">{fmtCurrency(pscRev)}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Revenue</div>
        </div>
      </div>

      {hasTarget && <ProgressBar currentPct={progressPct} expectedPct={expectedPct} status={status} height="h-2 md:h-2.5" />}

      {hasTarget && (
        <div className="flex justify-between text-xs md:text-sm text-slate-400">
          <span>{progressPct !== null ? `${progressPct.toFixed(0)}% complete` : "—"}</span>
          <span className="truncate">{paceGap !== null ? `${fmtSigned(paceGap, (n) => fmtNumber(n))} vs pace` : ""}</span>
        </div>
      )}

      {hasTarget && targetSource === "fallback" && (
        <div className="text-xs text-slate-500 truncate">Target: business rule (no spreadsheet target found)</div>
      )}
    </div>
  );
}
