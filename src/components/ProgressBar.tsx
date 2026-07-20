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
  const clamped = currentPct === null ? 0 : Math.min(currentPct, 130);
  const barWidth = Math.min(clamped, 100);
  const overflowWidth = Math.max(clamped - 100, 0);

  return (
    <div className="relative w-full">
      <div className={`relative w-full ${height} rounded-full bg-white/5 border border-white/10 overflow-visible`}>
        <div
          className={`${height} rounded-full ${colors.dot} transition-all duration-700`}
          style={{ width: `${barWidth}%` }}
        />
        {overflowWidth > 0 && (
          <div
            className={`absolute top-0 ${height} rounded-r-full bg-emerald-300`}
            style={{ left: "100%", width: `${Math.min(overflowWidth, 30)}%`, transform: "translateX(0)" }}
          />
        )}
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
    </div>
  );
}
