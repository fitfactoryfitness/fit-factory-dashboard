"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardPayload } from "@/types/dashboard";
import { buildViewModel } from "@/lib/viewModel";
import { AUTO_REFRESH_INTERVAL_MS } from "@/config/thresholds";
import { Header } from "./Header";
import { RevenueHero } from "./RevenueHero";
import { KpiCard } from "./KpiCard";
import { PscCard } from "./PscCard";
import { RevenueMetricsCard } from "./RevenueMetricsCard";
import { MrrForecastStrip } from "./MrrForecastStrip";
import { TrendChart } from "./TrendChart";
import { MidtownStrip } from "./MidtownStrip";
import { DebugPanel } from "./DebugPanel";

// Toggle to bring the Daily Revenue Trend card back — kept in the code (not
// deleted) per product request, just hidden from render for now.
const SHOW_TREND_CHART = true;

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

  // Desktop (md+) is treated as the actual TV/kiosk display: h-screen +
  // overflow-hidden, no page scroll — the whole point of a TV dashboard is
  // that everything is visible at a glance without anyone touching it. To
  // make that safe (unlike the earlier fixed-grid-rows version, which
  // clipped cards whose content didn't fit its assigned fraction), every
  // section below sizes to its own natural content height (shrink-0) except
  // the trend chart, which is the one section set to flex-1 min-h-0 and
  // absorbs whatever space is left over — it gracefully gets shorter/taller
  // instead of any card's numbers being cut off.
  // Mobile keeps the original scrolling behavior (min-h-screen, no
  // overflow-hidden), since a phone is never displaying this at a fixed
  // kiosk resolution.
  return (
    <div className="min-h-screen md:h-screen w-full flex flex-col md:overflow-hidden">
      <Header
        monthLabel={monthLabel}
        generatedAt={payload.generatedAt}
        dataSource={payload.dataSource}
        isMock={payload.dataSource === "mock"}
      />

      {error && (
        <div className="px-6 py-1 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs shrink-0">
          Showing last known data — refresh failed: {error}
        </div>
      )}

      <main className="flex-1 min-h-0 p-3 flex flex-col gap-3 md:overflow-hidden">
        <div className="shrink-0">
          <RevenueHero
            summary={payload.summary}
            goalProgress={vm.goalProgress}
            calendarProgressPct={vm.cal.calendarProgress * 100}
            remaining={vm.remaining}
            revenueStatus={vm.revenueStatus}
          />
        </div>

        {/* Trials and CP-to-Trials are the critical leading indicators per
            the brief. Revenue Pace (the four stats formerly inside
            RevenueHero) sits alongside them. New Memberships and PSC (count
            + revenue) share the last column, stacked. Utilization and
            Terminations cards were removed per product feedback (still
            tracked in the data, just not displayed as their own cards). On
            mobile these simply stack full-width, one after another. */}
        <div className="shrink-0 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <KpiCard kpi={vm.kpis[0]} />
          </div>
          <div>
            <KpiCard kpi={vm.kpis[1]} />
          </div>
          <div>
            <RevenueMetricsCard
              projectedRevenue={payload.summary.projectedRevenue}
              revenueGap={payload.summary.revenueGap}
              requiredDaily={vm.requiredDaily}
              actualDaily={vm.actualDaily}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-rows-2 md:gap-2">
            <div>
              <KpiCard kpi={vm.kpis[2]} />
            </div>
            <div>
              <PscCard psc={payload.summary.pscMTD} pscRev={payload.summary.pscRevMTD} />
            </div>
          </div>
        </div>

        {SHOW_TREND_CHART && (
          <div className="flex-1 min-h-[220px] md:min-h-0">
            <TrendChart daily={vm.daily} requiredDaily={vm.requiredDaily} />
          </div>
        )}

        <div className="shrink-0">
          <MrrForecastStrip
            plus1={payload.summary.mrrForecast.plus1}
            plus2={payload.summary.mrrForecast.plus2}
            plus3={payload.summary.mrrForecast.plus3}
          />
        </div>

        <div className="shrink-0 flex items-center pb-3 md:pb-0">
          {payload.summary.midtown && <MidtownStrip midtown={payload.summary.midtown} />}
        </div>
      </main>

      {debug && <DebugPanel payload={payload} error={error} />}
    </div>
  );
}
