"use client";

import { DailyPerformance } from "@/types/dashboard";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

const ABOVE_PACE_COLOR = "#22c55e"; // green — day's revenue at/above the flat pace line
const BELOW_PACE_COLOR = "#ef4444"; // red — day's revenue below it
const NO_TARGET_COLOR = "#38bdf8"; // neutral blue — only used if there's no goal to compare against at all

export function TrendChart({ daily, flatRequiredDaily }: { daily: DailyPerformance[]; flatRequiredDaily: number | null }) {
  // flatRequiredDaily is the FLAT monthly rate — revenue goal divided by
  // total days in the month (e.g. $85,000 / 31 = $2,742/day) — constant for
  // the whole month. Deliberately NOT the same as "Required / day" shown
  // elsewhere on the dashboard (RevenueMetricsCard), which is "how much more
  // per remaining day to catch up" and shrinks/grows as the month
  // progresses — that figure would make this reference line move day to
  // day, which defeats the point of a fixed benchmark to compare bars
  // against.
  // Revenue per day is the PRETAX (FF) column specifically (confirmed
  // against the live sheet: day 5 = cell H19 = 1,588.01, which is PRETAX,
  // not REV TOTAL or gross revenue) — read directly, no substitution.
  // Per-bar color is decided here (not in the render) from that same
  // day's own revenue vs. the flat pace line — a day with no revenue
  // posted yet (null) gets no color decision at all, Recharts just skips it.
  const data = daily.map((d) => {
    const revenue = d.pretaxRevenue;
    const color =
      revenue === null || flatRequiredDaily === null ? NO_TARGET_COLOR : revenue >= flatRequiredDaily ? ABOVE_PACE_COLOR : BELOW_PACE_COLOR;
    return { day: d.dayOfMonth, revenue, color };
  });

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-3 md:p-4 h-full flex flex-col overflow-hidden">
      <h2 className="text-slate-300 text-base md:text-xl font-bold uppercase tracking-wide mb-1 shrink-0">Daily Revenue Trend — Downtown</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#232c38" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={15} />
            <YAxis stroke="#64748b" fontSize={15} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#161d27", border: "1px solid #232c38", color: "#e6edf3", fontSize: 16 }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              labelFormatter={(l) => `Day ${l}`}
            />
            {flatRequiredDaily !== null && (
              <ReferenceLine
                y={flatRequiredDaily}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: "Required daily pace", fill: "#f59e0b", fontSize: 14, position: "insideTopRight" }}
              />
            )}
            <Bar dataKey="revenue" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((entry) => (
                <Cell key={entry.day} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        Bar chart of daily Downtown revenue for the current month, colored green on days at or above the flat monthly pace line and red on
        days below it, with a reference line for the monthly goal divided evenly across every day of the month.
      </p>
    </div>
  );
}
