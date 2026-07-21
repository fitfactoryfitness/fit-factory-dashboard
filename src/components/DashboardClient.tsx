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

  // Layout is content-driven height everywhere, on every breakpoint — a
  // fixed h-screen grid with hard-clipped rows only works if the page fills
  // an actual fullscreen kiosk display with no browser chrome. In a normal
  // browser window (tabs, bookmarks bar, URL bar all eating into the real
  // viewport height) that same fixed grid silently clipped card content at
  // 100% zoom. Letting the page scroll if it doesn't fully fit is a much
  // safer failure mode than hiding numbers — and on an actual TV/kiosk at a
  // reasonable resolution, this should rarely need any scrolling at all.
  // Columns still switch from a single stacked mobile column to the wider
  // multi-column desktop layout at the `md` breakpoint; only row heights are
  // no longer forced to fractions of the viewport.
  return (
    <div className="min-h-screen w-full flex flex-col">
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

      <main className="flex-1 p-3 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-12">
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
        <div className="md:col-span-4">
          <KpiCard kpi={vm.kpis[0]} />
        </div>
        <div className="md:col-span-4">
          <KpiCard kpi={vm.kpis[1]} />
        </div>
        <div className="md:col-span-4 grid grid-cols-1 gap-3 md:grid-rows-2 md:gap-2">
          <div>
            <KpiCard kpi={vm.kpis[2]} />
          </div>
          <div>
            <PscCard psc={payload.summary.pscMTD} pscRev={payload.summary.pscRevMTD} />
          </div>
        </div>

        <div className="md:col-span-12 h-[320px] md:h-[380px]">
          <TrendChart daily={vm.daily} requiredDaily={vm.requiredDaily} />
        </div>

        <div className="md:col-span-12">
          <MrrForecastStrip
            plus1={payload.summary.mrrForecast.plus1}
            plus2={payload.summary.mrrForecast.plus2}
            plus3={payload.summary.mrrForecast.plus3}
          />
        </div>

        <div className="md:col-span-12 flex items-center pb-3 md:pb-0">
          {payload.summary.midtown && <MidtownStrip midtown={payload.summary.midtown} />}
        </div>
      </main>

      {debug && <DebugPanel payload={payload} error={error} />}
    </div>
  );
}
