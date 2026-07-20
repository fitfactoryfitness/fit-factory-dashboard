"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardPayload } from "@/types/dashboard";
import { buildViewModel } from "@/lib/viewModel";
import { AUTO_REFRESH_INTERVAL_MS } from "@/config/thresholds";
import { Header } from "./Header";
import { RevenueHero } from "./RevenueHero";
import { KpiCard } from "./KpiCard";
import { PscCard } from "./PscCard";
import { MrrForecastStrip } from "./MrrForecastStrip";
import { TrendChart } from "./TrendChart";
import { MidtownStrip } from "./MidtownStrip";
import { DebugPanel } from "./DebugPanel";

async function fetchDashboard(): Promise<{ payload: DashboardPayload; error: string | null }> {
  const res = await fetch("/api/dashboard", { cache: "no-store" });
  const json = await res.json();
  if (!json.payload) throw new Error(json.error || "Failed to load dashboard data.");
  return json;
}

export function DashboardClient({ initial, debug }: { initial: { payload: DashboardPayload; error: string | null }; debug: boolean }) {
  const [state, setState] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchDashboard();
      setState(result);
    } catch (err) {
      setState((prev) => ({ payload: prev.payload, error: err instanceof Error ? err.message : "Refresh failed" }));
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const { payload, error } = state;
  const vm = useMemo(() => buildViewModel(payload, new Date()), [payload]);

  const monthLabel = new Date(payload.generatedAt)
    .toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: payload.timezone })
    .toUpperCase();

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      <Header
        monthLabel={monthLabel}
        generatedAt={payload.generatedAt}
        dataSource={payload.dataSource}
        isMock={payload.dataSource === "mock"}
      />

      {error && (
        <div className="px-6 py-1 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs">
          Showing last known data — refresh failed: {error}
        </div>
      )}

      <main className="flex-1 min-h-0 p-3 grid grid-cols-12 grid-rows-12 gap-3">
        <div className="col-span-12 row-span-4 min-h-0 overflow-hidden">
          <RevenueHero
            summary={payload.summary}
            goalProgress={vm.goalProgress}
            calendarProgressPct={vm.cal.calendarProgress * 100}
            remaining={vm.remaining}
            requiredDaily={vm.requiredDaily}
            actualDaily={vm.actualDaily}
            revenueStatus={vm.revenueStatus}
          />
        </div>

        {/* Trials and CP-to-Trials are the critical leading indicators per
            the brief, so they each get a full quarter of the screen. New
            Memberships and PSC (count + revenue) share the last column,
            stacked. Utilization and Terminations cards were removed per
            product feedback (still tracked in the data, just not displayed
            as their own cards). */}
        <div className="col-span-4 row-span-4 min-h-0 overflow-hidden">
          <KpiCard kpi={vm.kpis[0]} />
        </div>
        <div className="col-span-4 row-span-4 min-h-0 overflow-hidden">
          <KpiCard kpi={vm.kpis[1]} />
        </div>
        <div className="col-span-4 row-span-4 min-h-0 overflow-hidden grid grid-rows-2 gap-2">
          <div className="min-h-0 overflow-hidden">
            <KpiCard kpi={vm.kpis[2]} />
          </div>
          <div className="min-h-0 overflow-hidden">
            <PscCard psc={payload.summary.pscMTD} pscRev={payload.summary.pscRevMTD} />
          </div>
        </div>

        <div className="col-span-12 row-span-2 min-h-0 overflow-hidden">
          <TrendChart daily={vm.daily} requiredDaily={vm.requiredDaily} />
        </div>

        <div className="col-span-12 row-span-1 min-h-0 overflow-hidden">
          <MrrForecastStrip
            plus1={payload.summary.mrrForecast.plus1}
            plus2={payload.summary.mrrForecast.plus2}
            plus3={payload.summary.mrrForecast.plus3}
          />
        </div>

        <div className="col-span-12 row-span-1 min-h-0 overflow-hidden flex items-center">
          {payload.summary.midtown && <MidtownStrip midtown={payload.summary.midtown} />}
        </div>
      </main>

      {debug && <DebugPanel payload={payload} error={error} />}
    </div>
  );
}
