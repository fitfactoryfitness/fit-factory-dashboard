export function fmtCurrency(n: number | null, opts: { maximumFractionDigits?: number } = {}): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.maximumFractionDigits ?? 0,
  });
}

export function fmtCurrencyPrecise(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtNumber(n: number | null, digits = 0): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtPercent(n: number | null, digits = 1): string {
  if (n === null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtSigned(n: number | null, fmt: (n: number | null) => string): string {
  if (n === null) return "—";
  const s = fmt(Math.abs(n));
  return n < 0 ? `-${s}` : n > 0 ? `+${s}` : s;
}

export const STATUS_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  ahead: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  "on-track": { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  achieved: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  "at-risk": { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400" },
  "off-track": { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-400" },
  unavailable: { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", dot: "bg-slate-400" },
};

export const OVERALL_STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  TARGET_ACHIEVED: { label: "TARGET ACHIEVED", color: "emerald", icon: "✓" },
  ON_TRACK: { label: "ON TRACK", color: "emerald", icon: "✓" },
  AT_RISK: { label: "AT RISK", color: "amber", icon: "!" },
  OFF_TRACK: { label: "OFF TRACK", color: "red", icon: "✕" },
};
