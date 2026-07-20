import { MonthlySummary } from "@/types/dashboard";
import { fmtCurrency } from "@/lib/format";

export function MidtownStrip({ midtown }: { midtown: MonthlySummary["midtown"] }) {
  if (!midtown) return null;
  return (
    <div className="flex items-center flex-wrap gap-3 md:gap-6 px-4 md:px-5 py-3 md:py-2 rounded-xl border border-bg-border bg-bg-panel text-sm md:text-lg text-slate-400 w-full md:h-full overflow-hidden md:whitespace-nowrap">
      <span className="font-bold text-slate-300 uppercase text-sm tracking-wide shrink-0">Midtown (secondary)</span>
      <span>Revenue MTD: <span className="text-slate-200 font-semibold">{fmtCurrency(midtown.revenueMTD)}</span></span>
      <span>Target: <span className="text-slate-200 font-semibold">{fmtCurrency(midtown.revenueTarget)}</span></span>
      <span>Gap: <span className="text-slate-200 font-semibold">{fmtCurrency(midtown.revenueGap)}</span></span>
    </div>
  );
}
