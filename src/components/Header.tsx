"use client";

import { FRESHNESS_THRESHOLDS_MINUTES } from "@/config/thresholds";
import { useEffect, useState } from "react";
import Image from "next/image";
// Imported directly from src/ (not public/) as a build-time asset — this
// works regardless of location in the project, unlike a plain <img src="/...">
// URL, which only resolves files actually placed in the public/ folder.
import logoWhite from "@/logo-white.png";

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
    <header className="flex items-center justify-between flex-wrap gap-2 px-4 md:px-6 py-2 md:py-3 border-b border-bg-border bg-bg-panel">
      <div className="flex items-center gap-3 md:gap-4 flex-wrap">
        {/* Height-capped, width auto (not the other way around): the source
            file has significant transparent padding baked in around the
            visible mark, so letting width drive sizing (e.g. via min-width)
            makes the whole file — padding included — balloon in height,
            which is what broke the header layout. If this still reads as
            "too small," the fix is re-cropping the source PNG to remove
            that padding, not further CSS sizing tricks. */}
        <Image src={logoWhite} alt="Fit Factory" className="h-16 md:h-24 w-auto" priority />
        <span className="text-slate-400 text-lg md:text-2xl font-semibold">{monthLabel}</span>
        {isMock && (
          <span className="text-xs md:text-sm font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
            MOCK DATA
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-sm md:text-lg">
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
