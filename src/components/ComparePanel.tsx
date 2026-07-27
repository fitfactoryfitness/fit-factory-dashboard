"use client";

import { useState } from "react";
import { fmtCurrency, fmtNumber, fmtPercent } from "@/lib/format";
import { monthFullName } from "@/lib/monthLabels";
import { MonthlySummary } from "@/types/dashboard";
import { YtdSummary } from "@/lib/calculations/ytd";

const MAX_MONTHS = 3;

// One normalized shape for a comparison column, whether it came from a
// single month's MonthlySummary or from the summed YtdSummary — every field
// here is a value each source already computed itself (a direct per-month
// read for MonthlySummary; a sum of per-month reads for YtdSummary, see
// lib/calculations/ytd.ts for why that's a deliberate, flagged exception).
// Nothing is derived again at this layer.
type CompareColumn = {
  label: string;
  isYtd: boolean;
  revenueMTD: number | null;
  trialsMTD: number | null;
  cpToTrialsMTD: number | null;
  newMembershipsMTD: number | null;
  totalSalesMTD: number | null;
  pscMTD: number | null;
  pscRevMTD: number | null;
  terminationsMTD: number | null;
  revenueLostMTD: number | null;
  utilizationPct: number | null;
};

function fromMonthlySummary(tab: string, summary: MonthlySummary): CompareColumn {
  return {
    label: `${monthFullName(tab)} ${summary.year}`,
    isYtd: false,
    revenueMTD: summary.revenueMTD,
    trialsMTD: summary.trialsMTD,
    cpToTrialsMTD: summary.cpToTrialsMTD,
    newMembershipsMTD: summary.newMembershipsMTD,
    totalSalesMTD: summary.totalSalesMTD,
    pscMTD: summary.pscMTD,
    pscRevMTD: summary.pscRevMTD,
    terminationsMTD: summary.terminationsMTD,
    revenueLostMTD: summary.revenueLostMTD,
    utilizationPct: summary.utilizationMTD,
  };
}

function fromYtd(ytd: YtdSummary): CompareColumn {
  const last = ytd.monthsIncluded[ytd.monthsIncluded.length - 1];
  return {
    label: `YTD (thru ${monthFullName(last ?? "")})`,
    isYtd: true,
    revenueMTD: ytd.revenueMTD,
    trialsMTD: ytd.trialsMTD,
    cpToTrialsMTD: ytd.cpToTrialsMTD,
    newMembershipsMTD: ytd.newMembershipsMTD,
    totalSalesMTD: ytd.totalSalesMTD,
    pscMTD: ytd.pscMTD,
    pscRevMTD: ytd.pscRevMTD,
    terminationsMTD: ytd.terminationsMTD,
    revenueLostMTD: ytd.revenueLostMTD,
    utilizationPct: ytd.utilizationAvgPct,
  };
}

const METRIC_ROWS: { key: keyof CompareColumn; label: string; fmt: (n: number | null) => string }[] = [
  { key: "revenueMTD", label: "Revenue", fmt: (n) => fmtCurrency(n) },
  { key: "trialsMTD", label: "Trials", fmt: (n) => fmtNumber(n) },
  { key: "cpToTrialsMTD", label: "CP to Trials", fmt: (n) => fmtNumber(n) },
  { key: "newMembershipsMTD", label: "New Memberships", fmt: (n) => fmtNumber(n) },
  { key: "totalSalesMTD", label: "Total Sales", fmt: (n) => fmtNumber(n) },
  { key: "pscMTD", label: "PSC Count", fmt: (n) => fmtNumber(n) },
  { key: "pscRevMTD", label: "PSC Revenue", fmt: (n) => fmtCurrency(n) },
  { key: "terminationsMTD", label: "Terminations", fmt: (n) => fmtNumber(n) },
  { key: "revenueLostMTD", label: "Revenue Lost", fmt: (n) => fmtCurrency(n) },
  { key: "utilizationPct", label: "Utilization", fmt: (n) => fmtPercent(n) },
];

export function ComparePanel({
  open,
  onClose,
  availableMonths,
  currentMonthTab,
}: {
  open: boolean;
  onClose: () => void;
  availableMonths: string[];
  currentMonthTab: string;
}) {
  const [selected, setSelected] = useState<string[]>([currentMonthTab].filter(Boolean));
  const [includeYtd, setIncludeYtd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<CompareColumn[] | null>(null);

  if (!open) return null;

  function toggleMonth(m: string) {
    setSelected((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      if (prev.length >= MAX_MONTHS) return prev; // silently capped — checkboxes are disabled past the limit too
      return [...prev, m];
    });
  }

  async function runCompare() {
    if (selected.length === 0 && !includeYtd) {
      setError("Pick at least one month, or Year to Date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const monthCols = await Promise.all(
        selected.map(async (tab) => {
          const res = await fetch(`/api/dashboard?month=${tab}`, { cache: "no-store" });
          const json = await res.json();
          if (!json.payload) throw new Error(json.error || `Failed to load ${tab}`);
          return fromMonthlySummary(tab, json.payload.summary as MonthlySummary);
        })
      );

      let ytdCol: CompareColumn | null = null;
      if (includeYtd) {
        // "Year to Date" always means Jan through the live current month —
        // it runs through the ongoing month regardless of which specific
        // months are checked above for side-by-side comparison. Checking
        // only, say, June for comparison shouldn't cap YTD at June and
        // silently drop July's (still-in-progress) data from the total.
        const res = await fetch(`/api/ytd?through=${currentMonthTab}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.ytd) throw new Error(json.error || "Failed to load Year to Date");
        ytdCol = fromYtd(json.ytd as YtdSummary);
      }

      setColumns([...monthCols, ...(ytdCol ? [ytdCol] : [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison");
      setColumns(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl border border-bg-border bg-bg-panel p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200">Compare Months</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none px-2">
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableMonths.map((m) => {
            const isSelected = selected.includes(m);
            const disabled = !isSelected && selected.length >= MAX_MONTHS;
            return (
              <label
                key={m}
                className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md border cursor-pointer select-none ${
                  isSelected ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-bg-border text-slate-400"
                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <input type="checkbox" className="accent-emerald-500" checked={isSelected} disabled={disabled} onChange={() => toggleMonth(m)} />
                {monthFullName(m)}
              </label>
            );
          })}
        </div>
        <div className="text-xs text-slate-500">Pick up to {MAX_MONTHS} months.</div>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none w-fit">
          <input type="checkbox" className="accent-sky-500" checked={includeYtd} onChange={(e) => setIncludeYtd(e.target.checked)} />
          Include Year to Date
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runCompare}
            disabled={loading}
            className="text-sm font-semibold px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Compare"}
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>

        {columns && columns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr>
                  <th className="text-slate-500 font-medium py-1.5 pr-4 whitespace-nowrap">Metric</th>
                  {columns.map((c, i) => (
                    <th key={i} className={`py-1.5 px-3 font-semibold whitespace-nowrap ${c.isYtd ? "text-sky-300" : "text-slate-200"}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-bg-border">
                    <td className="text-slate-400 py-1.5 pr-4 whitespace-nowrap">{row.label}</td>
                    {columns.map((c, i) => (
                      <td key={i} className="py-1.5 px-3 text-white font-medium whitespace-nowrap">
                        {row.fmt(c[row.key] as number | null)}
                        {row.key === "utilizationPct" && c.isYtd && <span className="text-slate-500 text-xs"> (avg)</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
