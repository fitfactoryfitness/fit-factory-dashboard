import { MonthlySummary } from "@/types/dashboard";
import { fmtCurrency } from "@/lib/format";

export function MidtownStrip({ midtown }: { midtown: MonthlySummary["midtown"] }) {
  if (!midtown) return null;
  return (
    <div className="flex items-center gap-6 px-5 py-2 rounded-xl border border-bg-border bg-bg-panel text-lg text-slate-400 h-full overflow-hidden whitespace-nowrap">
      <span className="font-bold text-slate-300 uppercase text-sm tracking-wide shrink-0">Midtown (secondary)</span>
      <span>Revenue MTD: <span className="text-slate-200 font-semibold">{fmtCurrency(midtown.revenueMTD)}</span></span>
      <span>Target: <span className="text-slate-200 font-semibold">{fmtCurrency(midtown.revenueTarget)}</span></span>
      <span>Gap: <span className="text-slate-200 font-semibold">{fmtCurrency(midtown.revenueGap)}</span></span>
    </div>
  );
}
