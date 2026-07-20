import { SheetGrid } from "@/lib/googleSheets/client";
import { findAliasKey } from "@/config/aliases";
import { parseCurrency, parseNumber, parsePercent, isBlank } from "./valueParsing";
import { DOWNTOWN_SUMMARY_FALLBACK } from "@/config/fallbackCells";
import { DiagnosticsEntry } from "@/types/dashboard";

type FieldKind = "currency" | "percent" | "number";

export type SummaryFields = {
  revenueGoal: number | null;
  revenueMTD: number | null;
  projectedRevenue: number | null;
  revenueGap: number | null;
  bookedRevenue: number | null;
  membershipStart: number | null;
  utilizationGoalPct: number | null;
  attritionGoalPct: number | null;
  totalSalesMTD: number | null;
  midtown: {
    revenueTarget: number | null;
    revenueMTD: number | null;
    revenueGap: number | null;
    bookedRevenue: number | null;
  };
};

const SEARCH_ROWS = 12; // the top summary block lives in roughly the first dozen rows

function colOf(row: string[] | undefined, col: number): string {
  return row?.[col] ?? "";
}

function findMarkerCol(grid: SheetGrid, marker: string): number | null {
  for (let r = 0; r < Math.min(SEARCH_ROWS, grid.length); r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      if ((row[c] || "").trim().toUpperCase() === marker) return c;
    }
  }
  return null;
}

// Looks rightward (and slightly downward, for wrapped layouts) from a label
// cell for the first parseable value of the expected kind.
function findAdjacentValue(
  grid: SheetGrid,
  row: number,
  col: number,
  kind: FieldKind
): { raw: string | null; value: number | null; warning?: string; sourceCell?: string } {
  for (let dc = 1; dc <= 4; dc++) {
    const raw = colOf(grid[row], col + dc);
    if (isBlank(raw)) continue;
    const parsed = kind === "currency" ? parseCurrency(raw) : kind === "percent" ? parsePercent(raw) : parseNumber(raw);
    if (parsed.value !== null) {
      return { raw, value: parsed.value, warning: parsed.warning, sourceCell: `R${row + 1}C${col + dc + 1}` };
    }
  }
  return { raw: null, value: null };
}

function labelSearch(
  grid: SheetGrid,
  aliasKey: string,
  kind: FieldKind,
  colRange: [number, number] | null,
  diagnostics: DiagnosticsEntry[],
  fieldName: string
): number | null {
  for (let r = 0; r < Math.min(SEARCH_ROWS, grid.length); r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (colRange && (c < colRange[0] || c > colRange[1])) continue;
      const cellText = row[c];
      if (!cellText) continue;
      if (findAliasKey(cellText) !== aliasKey) continue;
      const result = findAdjacentValue(grid, r, c, kind);
      if (result.value !== null) {
        diagnostics.push({
          metric: fieldName,
          label: cellText,
          resolvedVia: "label",
          sourceCell: result.sourceCell,
          warning: result.warning,
        });
        return result.value;
      }
    }
  }
  return null;
}

export function parseSummary(grid: SheetGrid, diagnostics: DiagnosticsEntry[]): SummaryFields {
  const midtownCol = findMarkerCol(grid, "MIDTOWN");
  const downtownRange: [number, number] | null = midtownCol !== null ? [0, midtownCol - 1] : null;
  const midtownRange: [number, number] | null = midtownCol !== null ? [midtownCol, 999] : null;

  function fallback(field: keyof typeof DOWNTOWN_SUMMARY_FALLBACK, kind: FieldKind, fieldName: string): number | null {
    const cell = DOWNTOWN_SUMMARY_FALLBACK[field];
    const raw = colOf(grid[cell.row], cell.col);
    if (isBlank(raw)) return null;
    const parsed = kind === "currency" ? parseCurrency(raw) : kind === "percent" ? parsePercent(raw) : parseNumber(raw);
    diagnostics.push({
      metric: fieldName,
      label: `fallback cell ${cell.ref}`,
      resolvedVia: "fallback",
      sourceCell: cell.ref,
      warning: parsed.warning || "Resolved via fallback coordinates, not label match.",
    });
    return parsed.value;
  }

  const revenueGoal =
    labelSearch(grid, "revenueGoal", "currency", downtownRange, diagnostics, "revenueGoal") ??
    fallback("revenueGoal", "currency", "revenueGoal");
  const revenueMTD =
    labelSearch(grid, "revenueMTD", "currency", downtownRange, diagnostics, "revenueMTD") ??
    fallback("revenueMTD", "currency", "revenueMTD");
  const projectedRevenue =
    labelSearch(grid, "projectedRevenue", "currency", downtownRange, diagnostics, "projectedRevenue") ??
    fallback("projectedRevenue", "currency", "projectedRevenue");
  const revenueGap =
    labelSearch(grid, "gapToGoalMonth", "currency", downtownRange, diagnostics, "revenueGap") ??
    fallback("gapToGoalMonth", "currency", "revenueGap");
  const bookedRevenue = labelSearch(grid, "bookedRevenue", "currency", downtownRange, diagnostics, "bookedRevenue");
  const membershipStart = labelSearch(grid, "membershipStart", "number", downtownRange, diagnostics, "membershipStart");
  const utilizationGoalPct = labelSearch(grid, "utilizationGoal", "percent", downtownRange, diagnostics, "utilizationGoalPct");
  const attritionGoalPct = labelSearch(grid, "attritionGoal", "percent", downtownRange, diagnostics, "attritionGoalPct");
  const totalSalesMTD = labelSearch(grid, "totalSales", "number", downtownRange, diagnostics, "totalSalesMTD");

  // Midtown: secondary comparison only. Note "revenueGoal" alias also
  // matches Midtown's "REVENUE TARGET" label (see aliases.ts) — this is a
  // confirmed real-world label inconsistency between the two locations.
  const mtRevenueTarget = midtownRange
    ? labelSearch(grid, "revenueGoal", "currency", midtownRange, diagnostics, "midtown.revenueTarget")
    : null;
  const mtRevenueMTD = midtownRange
    ? labelSearch(grid, "revenueMTD", "currency", midtownRange, diagnostics, "midtown.revenueMTD")
    : null;
  const mtRevenueGap = midtownRange
    ? labelSearch(grid, "gapToGoalMonth", "currency", midtownRange, diagnostics, "midtown.revenueGap")
    : null;
  const mtBookedRevenue = midtownRange
    ? labelSearch(grid, "bookedRevenue", "currency", midtownRange, diagnostics, "midtown.bookedRevenue")
    : null;

  return {
    revenueGoal,
    revenueMTD,
    projectedRevenue,
    revenueGap,
    bookedRevenue,
    membershipStart,
    utilizationGoalPct,
    attritionGoalPct,
    totalSalesMTD,
    midtown: {
      revenueTarget: mtRevenueTarget,
      revenueMTD: mtRevenueMTD,
      revenueGap: mtRevenueGap,
      bookedRevenue: mtBookedRevenue,
    },
  };
}
