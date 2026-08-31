"use client";

import { STATUS_COLORS } from "@/lib/format";
import { MetricStatus } from "@/types/dashboard";

export function ProgressBar({
  currentPct,
  expectedPct,
  status,
  height = "h-4",
  showExpectedMarker = true,
}: {
  currentPct: number | null; // 0-100+, may exceed 100
  expectedPct: number | null; // 0-100, the "should be here by now" marker
  status: MetricStatus;
  height?: string;
  showExpectedMarker?: boolean;
}) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.unavailable;
  // Fill never visually exceeds the track, even when the underlying metric
  // is past 100% of target (e.g. Trials at 108%) — the number itself still
  // reads as "108% complete" next to the bar, it just doesn't render as a
  // bar bleeding past its own container.
  const barWidth = currentPct === null ? 0 : Math.max(0, Math.min(currentPct, 100));

  return (
    <div className="relative w-full">
      <div className={`relative w-full ${height} rounded-full bg-white/5 border border-white/10 overflow-hidden`}>
        <div
          className={`${height} rounded-full ${colors.dot} transition-all duration-700`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {showExpectedMarker && expectedPct !== null && expectedPct > 0 && expectedPct <= 100 && (
        <div
          className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-white/70"
          style={{ left: `${Math.min(expectedPct, 100)}%` }}
          title={`Expected progress by today: ${expectedPct.toFixed(1)}%`}
        />
      )}
      <div
        className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-white/30"
        style={{ left: "100%" }}
        title="Goal"
      />
    </div>
  );
}
