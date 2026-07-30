"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardPayload } from "@/types/dashboard";
import { buildViewModel } from "@/lib/viewModel";
import { AUTO_REFRESH_INTERVAL_MS } from "@/config/thresholds";
import { monthFullName } from "@/lib/monthLabels";
import { Header } from "./Header";
import { RevenueHero } from "./RevenueHero";
import { KpiCard } from "./KpiCard";
import { PscCard } from "./PscCard";
import { RevenueMetricsCard } from "./RevenueMetricsCard";
import { MrrForecastStrip } from "./MrrForecastStrip";
import { TrendChart } from "./TrendChart";
import { MidtownStrip } from "./MidtownStrip";
import { DebugPanel } from "./DebugPanel";
import { ComparePanel } from "./ComparePanel";

// Toggle to bring the Daily Revenue Trend card back — kept in the code (not
// deleted) per product request, just hidden from render for now.
const SHOW_TREND_CHART = true;

async function fetchDashboard(): Promise<{ payload: DashboardPayload; error: string | null }> {
  const res = await fetch("/api/dashboard", { cache: "no-store" });
  const json = await res.json();
  if (!json.payload) throw new Error(json.error || "Failed to load dashboard data.");
  return json;
}

async function fetchDashboardForMonth(month: string): Promise<DashboardPayload> {
  const res = await fetch(`/api/dashboard?month=${month}`, { cache: "no-store" });
  const json = await res.json();
  if (!json.payload) throw new Error(json.error || `Failed to load ${month}.`);
  return json.payload as DashboardPayload;
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

  // Month selector state. viewMonth === null means "live" — the auto-
  // refreshing current-month data above is what's shown. Picking a month
  // from the dropdown fetches that tab once (historical data doesn't need
  // polling) and swaps the rendered payload without touching the live poll,
  // so "Back to Live" is instant.
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [currentMonthTab, setCurrentMonthTab] = useState<string>("");
  const [viewMonth, setViewMonth] = useState<string | null>(null);
  const [historicalPayload, setHistoricalPayload] = useState<DashboardPayload | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then((json) => {
        setAvailableMonths(json.months || []);
        setCurrentMonthTab(json.current || "");
      })
      .catch(() => {
        // Non-fatal — the month selector just won't render if this fails;
        // the live kiosk view above is entirely unaffected.
      });
  }, []);

  const handleSelectMonth = useCallback(
    (month: string) => {
      if (month === currentMonthTab) {
        setViewMonth(null);
        return;
      }
      setViewMonth(month);
      setHistoricalLoading(true);
      setHistoricalError(null);
      fetchDashboardForMonth(month)
        .then((p) => setHistoricalPayload(p))
        .catch((err) => setHistoricalError(err instanceof Error ? err.message : "Failed to load month"))
        .finally(() => setHistoricalLoading(false));
    },
    [currentMonthTab]
  );

  const { payload: livePayload, error } = state;
  // Only swap to the historical payload once it's actually loaded AND
  // matches the currently selected month (avoids briefly showing a stale
  // previous selection while the new one is still loading).
  const isViewingHistorical = viewMonth !== null && historicalPayload !== null && historicalPayload.summary.tabName === viewMonth;
  const payload = isViewingHistorical ? historicalPayload : livePayload;
  // isHistorical tells buildViewModel this month is CLOSED, not in progress
  // — see the big comment on buildViewModel for why that changes the pace
  // math (a past month shouldn't be judged against today's date).
  const vm = useMemo(() => buildViewModel(payload, new Date(), isViewingHistorical), [payload, isViewingHistorical]);

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
        availableMonths={availableMonths}
        selectedMonth={viewMonth ?? currentMonthTab}
        year={payload.summary.year}
        onSelectMonth={handleSelectMonth}
        onOpenCompare={() => setCompareOpen(true)}
      />

      {viewMonth && (
        <div className="px-6 py-1 bg-sky-500/10 border-b border-sky-500/30 text-sky-300 text-xs shrink-0 flex items-center gap-3">
          {historicalLoading ? (
            <span>Loading {monthFullName(viewMonth)}…</span>
          ) : historicalError ? (
            <span className="text-red-300">Failed to load {monthFullName(viewMonth)}: {historicalError} — showing live data below.</span>
          ) : (
            <span>Viewing {monthFullName(viewMonth)} — historical, not live.</span>
          )}
          <button type="button" onClick={() => setViewMonth(null)} className="underline hover:no-underline">
            Back to Live
          </button>
        </div>
      )}

      {error && (
        <div className="px-6 py-1 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs shrink-0">
          Showing last known data — refresh failed: {error}
        </div>
      )}

      <main className="flex-1 min-h-0 p-3 flex flex-col gap-3 md:gap-2 md:overflow-hidden">
        <div className="shrink-0">
          <RevenueHero
            summary={payload.summary}
            goalProgress={vm.goalProgress}
            calendarProgressPct={vm.cal.calendarProgress * 100}
            remaining={vm.remaining}
            revenueStatus={vm.revenueStatus}
            isHistorical={isViewingHistorical}
          />
        </div>

        {/* Trials and CP-to-Trials are the critical leading indicators per
            the brief. Revenue Pace (the four stats formerly inside
            RevenueHero) sits alongside them. New Memberships and PSC (count
            + revenue) share the last column, stacked. Utilization and
            Terminations cards were removed per product feedback (still
            tracked in the data, just not displayed as their own cards). On
            mobile these simply stack full-width, one after another. */}
        <div className="shrink-0 grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-2">
          <div>
            <KpiCard kpi={vm.kpis[0]} />
          </div>
          <div>
            <KpiCard kpi={vm.kpis[1]} />
          </div>
          <div>
            <RevenueMetricsCard
              projectedRevenue={vm.effectiveProjectedRevenue}
              revenueGap={vm.effectiveGap}
              requiredDaily={vm.requiredDaily}
              actualDaily={vm.actualDaily}
              isHistorical={isViewingHistorical}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-rows-2 md:gap-1.5">
            <div>
              <KpiCard kpi={vm.kpis[2]} />
            </div>
            <div>
              <PscCard
                psc={payload.summary.pscMTD}
                pscRev={payload.summary.pscRevMTD}
                target={vm.kpis[3].target}
                targetSource={vm.kpis[3].targetSource}
                progressPct={vm.kpis[3].progressPct}
                expectedByToday={vm.kpis[3].expectedByToday}
                status={vm.kpis[3].status}
                paceGap={vm.kpis[3].paceGap}
              />
            </div>
          </div>
        </div>

        {SHOW_TREND_CHART && (
          // Mobile gets a fixed pixel height (h-[280px]), not flex-1: Recharts'
          // ResponsiveContainer needs a parent with a real, already-resolved
          // height at mount time. On mobile the page has no height-constrained
          // ancestor (min-h-screen, scrolls, no fixed viewport), so a flex-1
          // item's height comes from the browser's flex layout pass rather
          // than an explicit value, and ResponsiveContainer was measuring 0
          // and never recovering — that's why the chart was invisible on
          // phones. Desktop keeps flex-1 (fills the remaining fixed-viewport
          // space), since there h-screen on the outer container gives every
          // flex ancestor a definite height to grow into.
          <div className="h-[280px] md:h-auto md:flex-1 md:min-h-0">
            <TrendChart daily={vm.daily} flatRequiredDaily={vm.flatRequiredDaily} />
          </div>
        )}

        {/* Forward-looking forecast — meaningless for a closed past month,
            so it's hidden entirely rather than showing stale/frozen numbers
            when viewing anything other than the live current month. */}
        {!isViewingHistorical && (
          <div className="shrink-0">
            <MrrForecastStrip
              plus1={payload.summary.mrrForecast.plus1}
              plus2={payload.summary.mrrForecast.plus2}
              plus3={payload.summary.mrrForecast.plus3}
              plus1Previous={payload.summary.mrrForecast.plus1Previous}
              plus2Previous={payload.summary.mrrForecast.plus2Previous}
              plus3Previous={payload.summary.mrrForecast.plus3Previous}
            />
          </div>
        )}

        <div className="shrink-0 flex items-center pb-3 md:pb-0">
          {payload.summary.midtown && <MidtownStrip midtown={payload.summary.midtown} />}
        </div>
      </main>

      {debug && <DebugPanel payload={payload} error={error} />}

      {compareOpen && (
        <ComparePanel
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          availableMonths={availableMonths}
          currentMonthTab={currentMonthTab}
        />
      )}
    </div>
  );
}
