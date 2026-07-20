import { MetricTarget } from "@/types/dashboard";

// Centralized target configuration.
// Each target records WHERE its value came from so the UI/diagnostics panel
// can explain provenance instead of presenting numbers as if they were all
// equally authoritative.
//
// Trials and CP-to-Trials targets are NOT present anywhere in the source
// spreadsheet (confirmed during discovery: no "TRIALS GOAL" / "CP TO TRIALS
// GOAL" cell exists in any tab). They are supplied here as fallback business
// rules until a trustworthy spreadsheet-driven target is identified.

export const FALLBACK_TARGETS: Record<string, MetricTarget> = {
  trials: {
    metricId: "trials",
    source: "fallback",
    value: 50,
    note: "No trials target cell found in the spreadsheet. Using business rule supplied by ownership (50/month) until a spreadsheet target is identified.",
  },
  cpToTrials: {
    metricId: "cpToTrials",
    source: "fallback",
    value: 30,
    note: "No CP-to-Trials target cell found in the spreadsheet. Using business rule supplied by ownership (30/month) until a spreadsheet target is identified.",
  },
};

// If a spreadsheet-provided target is later found (e.g. a "TRIALS GOAL" cell
// is added), the resolver in lib/spreadsheetParser should return a
// MetricTarget with source: "spreadsheet" and a sourceReference, which
// should take priority over the fallback below. See resolveTarget().
export function resolveTarget(
  metricId: string,
  spreadsheetTarget: { value: number; sourceReference: string } | null
): MetricTarget {
  if (spreadsheetTarget && Number.isFinite(spreadsheetTarget.value) && spreadsheetTarget.value > 0) {
    return {
      metricId,
      source: "spreadsheet",
      value: spreadsheetTarget.value,
      sourceReference: spreadsheetTarget.sourceReference,
      note: "Resolved from spreadsheet label lookup.",
    };
  }
  const fallback = FALLBACK_TARGETS[metricId];
  if (fallback) return fallback;
  return { metricId, source: "manual", value: 0, note: "No target configured." };
}
