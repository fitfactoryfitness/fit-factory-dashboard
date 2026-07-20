"use client";

import { FRESHNESS_THRESHOLDS_MINUTES } from "@/config/thresholds";
import { useEffect, useState } from "react";

function freshnessLabel(generatedAt: string): { label: string; cls: string } {
  const ageMin = (Date.now() - new Date(generatedAt).getTime()) / 60000;
  if (ageMin < FRESHNESS_THRESHOLDS_MINUTES.freshUntil) return { label: "Live", cls: "text-emerald-400" };
  if (ageMin < FRESHNESS_THRESHOLDS_MINUTES.staleUntil) return { label: "Stale", cls: "text-amber-400" };
  return { label: "Critical — refresh failing", cls: "text-red-400" };
}

export function Header({
  monthLabel,
  generatedAt,
  isMock,
}: {
  monthLabel: string;
  generatedAt: string;
  dataSource: "mock" | "google";
  isMock: boolean;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const freshness = freshnessLabel(generatedAt);
  const updatedTime = new Date(generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-bg-border bg-bg-panel">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Fit Factory" className="h-12 w-auto" />
        <span className="text-slate-400 text-2xl font-semibold">{monthLabel}</span>
        {isMock && (
          <span className="text-sm font-bold px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
            MOCK DATA
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-lg">
          <div className={freshness.cls}>{freshness.label} · Updated {updatedTime}</div>
          <div className="text-slate-500">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto" })}</div>
        </div>
        {/* No manual refresh control — this screen runs unattended on a TV
            with no input device. Data refreshes automatically on an
            interval (see AUTO_REFRESH_INTERVAL_MS); the "Live/Stale"
            indicator above communicates freshness without needing a click.
            The overall-status badge (e.g. "OFF TRACK") was removed per
            product feedback — RevenueHero's own pace badge already conveys
            status without a second, more alarming top-right tag. */}
      </div>
    </header>
  );
}
