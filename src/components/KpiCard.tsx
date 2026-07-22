"use client";

import { KpiCardData } from "@/types/dashboard";
import { fmtCurrency, fmtNumber, fmtPercent, fmtSigned, STATUS_COLORS } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";

const STATUS_TEXT: Record<string, string> = {
  ahead: "AHEAD OF PACE",
  "on-track": "ON PACE",
  "at-risk": "SLIGHTLY BEHIND",
  "off-track": "BEHIND PACE",
  achieved: "ACHIEVED",
  unavailable: "NO DATA",
};

const STATUS_ICON: Record<string, string> = {
  ahead: "▲",
  "on-track": "●",
  "at-risk": "▼",
  "off-track": "▼▼",
  achieved: "✓",
  unavailable: "—",
};

function unitFmt(unit: KpiCardData["unit"]) {
  if (unit === "currency") return (n: number | null) => fmtCurrency(n);
  if (unit === "percent") return (n: number | null) => fmtPercent(n);
  return (n: number | null) => fmtNumber(n);
}

export function KpiCard({ kpi }: { kpi: KpiCardData }) {
  const fmt = unitFmt(kpi.unit);
  const hasData = kpi.currentValue !== null;
  // Metrics without a configured target (Total Sales, New Memberships) are
  // not being paced, which is a different thing from having no data. Only
  // say "NO DATA" when the value itself is actually missing.
  const colors = kpi.hasTarget ? STATUS_COLORS[kpi.status] ?? STATUS_COLORS.unavailable : STATUS_COLORS.unavailable;
  const badgeText = !hasData ? "NO DATA" : kpi.hasTarget ? STATUS_TEXT[kpi.status] : "TRACKING";
  const badgeIcon = !hasData ? "—" : kpi.hasTarget ? STATUS_ICON[kpi.status] : "•";
  const expectedPct = kpi.target && kpi.target > 0 && kpi.expectedByToday !== null ? (kpi.expectedByToday / kpi.target) * 100 : null;

  return (
    <div className={`rounded-2xl border ${colors.border} bg-bg-card p-2.5 md:p-3 flex flex-col gap-1 md:gap-1.5 h-full overflow-hidden`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-300 text-sm md:text-base font-semibold uppercase tracking-wide truncate">{kpi.label}</span>
        <span className={`shrink-0 text-xs md:text-sm font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded ${colors.bg} ${colors.text} flex items-center gap-1 whitespace-nowrap`}>
          <span>{badgeIcon}</span>
          {badgeText}
        </span>
      </div>

      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-3xl md:text-5xl font-extrabold text-white leading-none truncate">{fmt(kpi.currentValue)}</span>
        {kpi.hasTarget && <span className="text-base md:text-xl text-slate-400 font-medium shrink-0">/ {fmt(kpi.target)}</span>}
      </div>

      {kpi.hasTarget && <ProgressBar currentPct={kpi.progressPct} expectedPct={expectedPct} status={kpi.status} height="h-2.5 md:h-3" />}

      {kpi.hasTarget ? (
        <div className="flex justify-between text-sm md:text-base text-slate-400">
          <span>{kpi.progressPct !== null ? `${kpi.progressPct.toFixed(0)}% complete` : "—"}</span>
          <span className="truncate">{kpi.paceGap !== null ? `${fmtSigned(kpi.paceGap, (n) => fmt(n))} vs pace` : ""}</span>
        </div>
      ) : (
        <div className="text-sm md:text-base text-slate-500">Tracked — no monthly target set</div>
      )}

      {kpi.hasTarget && kpi.requiredPerRemainingDay !== null && kpi.requiredPerRemainingDay > 0 && (
        <div className="text-sm md:text-base text-slate-300 truncate">
          {/* Ceil, not round: you can't book a fractional trial, and "need
              at least this many" is the only framing that stays consistent
              with the remaining-days count (rounding to nearest can imply
              a daily rate that under-shoots the target by month end). */}
          Need <span className="font-semibold text-white">{fmt(Math.ceil(kpi.requiredPerRemainingDay))}</span>/day to hit target
        </div>
      )}

      {kpi.hasTarget && kpi.targetSource === "fallback" && (
        <div className="text-xs text-slate-500 mt-auto truncate">Target: business rule (no spreadsheet target found)</div>
      )}
    </div>
  );
}
