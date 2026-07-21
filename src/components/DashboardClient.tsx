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

  // Layout is mobile-first by default (single stacked column, page scrolls
  // normally — a phone can't show a full 1920x1080 TV grid at a readable
  // size). At the `md` breakpoint and up, the original fixed 12x12 TV grid
  // takes over, filling the viewport with no scrolling, exactly as before.
  return (
    <div className="min-h-screen w-full flex flex-col md:h-screen md:overflow-hidden">
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

      <main className="flex-1 md:min-h-0 p-3 grid grid-cols-1 gap-3 md:grid-cols-12 md:grid-rows-12">
        <div className="md:col-span-12 md:row-span-4 md:min-h-0 md:overflow-hidden">
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
            as their own cards). On mobile these simply stack full-width,
            one after another. */}
        <div className="md:col-span-4 md:row-span-3 md:min-h-0 md:overflow-hidden">
          <KpiCard kpi={vm.kpis[0]} />
        </div>
        <div className="md:col-span-4 md:row-span-3 md:min-h-0 md:overflow-hidden">
          <KpiCard kpi={vm.kpis[1]} />
        </div>
        <div className="md:col-span-4 md:row-span-3 md:min-h-0 md:overflow-hidden grid grid-cols-1 gap-3 md:grid-rows-2 md:gap-2">
          <div className="md:min-h-0 md:overflow-hidden">
            <KpiCard kpi={vm.kpis[2]} />
          </div>
          <div className="md:min-h-0 md:overflow-hidden">
            <PscCard psc={payload.summary.pscMTD} pscRev={payload.summary.pscRevMTD} />
          </div>
        </div>

        <div className="md:col-span-12 md:row-span-3 md:min-h-0 md:overflow-hidden h-[320px] md:h-auto">
          <TrendChart daily={vm.daily} requiredDaily={vm.requiredDaily} />
        </div>

        <div className="md:col-span-12 md:row-span-1 md:min-h-0 md:overflow-hidden">
          <MrrForecastStrip
            plus1={payload.summary.mrrForecast.plus1}
            plus2={payload.summary.mrrForecast.plus2}
            plus3={payload.summary.mrrForecast.plus3}
          />
        </div>

        <div className="md:col-span-12 md:row-span-1 md:min-h-0 md:overflow-hidden flex items-center pb-3 md:pb-0">
          {payload.summary.midtown && <MidtownStrip midtown={payload.summary.midtown} />}
        </div>
      </main>

      {debug && <DebugPanel payload={payload} error={error} />}
    </div>
  );
}
