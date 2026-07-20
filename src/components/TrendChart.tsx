"use client";

import { DailyPerformance } from "@/types/dashboard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

export function TrendChart({ daily, requiredDaily }: { daily: DailyPerformance[]; requiredDaily: number | null }) {
  // Revenue per day is the PRETAX (FF) column specifically (confirmed
  // against the live sheet: day 5 = cell H19 = 1,588.01, which is PRETAX,
  // not REV TOTAL or gross revenue) — read directly, no substitution.
  const data = daily.map((d) => ({
    day: d.dayOfMonth,
    revenue: d.pretaxRevenue,
    recent: d.dayOfMonth > daily.length - 7,
  }));

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-3 md:p-4 h-full flex flex-col overflow-hidden">
      <h2 className="text-slate-300 text-base md:text-xl font-bold uppercase tracking-wide mb-1 shrink-0">Daily Revenue Trend — Downtown</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#232c38" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={15} />
            <YAxis stroke="#64748b" fontSize={15} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#161d27", border: "1px solid #232c38", color: "#e6edf3", fontSize: 16 }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              labelFormatter={(l) => `Day ${l}`}
            />
            {requiredDaily !== null && (
              <ReferenceLine y={requiredDaily} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Required daily pace", fill: "#f59e0b", fontSize: 14, position: "insideTopRight" }} />
            )}
            <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">Line chart of daily Downtown revenue for the current month, with a reference line for the revenue required per remaining day to reach the monthly goal.</p>
    </div>
  );
}
