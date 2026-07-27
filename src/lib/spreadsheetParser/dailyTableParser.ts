import { SheetGrid } from "@/lib/googleSheets/client";
import { findAliasKey } from "@/config/aliases";
import { parseCurrency, parseNumber, parsePercent, isBlank } from "./valueParsing";
import { DailyPerformance, DiagnosticsEntry } from "@/types/dashboard";
import { DAILY_TABLE_FALLBACK, PSC_TOTALS_FALLBACK, MRR_FORECAST_COLUMNS } from "@/config/fallbackCells";

const COUNT_FIELDS = new Set([
  "day",
  "trials",
  "cpToTrials",
  "booked",
  "show",
  "newMemberships",
  "classPacks",
  "pt",
  "frozen",
  "terminations",
  "noVisitLast7",
  "visits",
  "psc",
  "pscVisits",
  "cpVisits",
]);
const PERCENT_FIELDS = new Set(["utilization", "pscPct", "cpPct"]);
const CURRENCY_FIELDS = new Set([
  "grossRevenue",
  "memberships",
  "credits",
  "penaltyFees",
  "misc",
  "revTotal",
  "pretax",
  "totalSalesCol",
  "pscRev",
  "deposit",
  "refinedRev",
  "cpRev",
  "revLost",
  "bookedRevCol",
  "mrr",
]);

function fieldKind(key: string): "currency" | "percent" | "number" {
  if (PERCENT_FIELDS.has(key)) return "percent";
  if (CURRENCY_FIELDS.has(key)) return "currency";
  return "number";
}

function parseByKind(kind: "currency" | "percent" | "number", raw: string) {
  return kind === "currency" ? parseCurrency(raw) : kind === "percent" ? parsePercent(raw) : parseNumber(raw);
}

// Some tabs have TWO columns both labeled "DAY" — a weekday-abbreviation
// column ("SUN", "MON", ...) and the actual day-of-month number column.
// Label matching alone can't tell them apart (identical label text), so
// once we have candidate columns, we pick the one whose values actually
// parse as small sequential integers by sampling a few data rows — the
// weekday-text column will fail to parse as a number every time.
function pickDayNumberColumn(grid: SheetGrid, headerRowIndex: number, candidates: number[]): number | undefined {
  if (candidates.length <= 1) return candidates[0];
  const sampleRows = grid.slice(headerRowIndex + 1, headerRowIndex + 8);
  let bestCol = candidates[0];
  let bestScore = -1;
  for (const col of candidates) {
    let score = 0;
    for (const row of sampleRows) {
      const raw = row?.[col];
      if (isBlank(raw)) continue;
      const parsed = parseNumber(raw);
      if (parsed.value !== null && parsed.value >= 1 && parsed.value <= 31) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestCol;
}

// Google Sheets' values.get API only reports a merged cell's text in the
// merge's top-left cell — every other cell the merge spans back comes back
// as an empty string, it is NOT duplicated across the visual span. Real
// header bands are often two rows tall (a per-column label row like
// "TRIALS"/"REV TOTAL", stacked under/over a column like "DAY" that doesn't
// need its own group label and is therefore vertically merged across both
// header rows). If "DAY" only exists in row r-1 col 0, a single-row scan of
// row r will never see it, and header-row detection fails entirely — this is
// distinct from (and upstream of) the DAY/TOTALS column-shift handling below.
// To make header detection robust to this without hardcoding the merge
// geometry, we build an "effective" row for scanning purposes: any blank
// cell inherits the nearest non-blank value directly above it, within a
// small lookback window. This is ONLY used to locate the header row and
// build the column map — it is never applied when reading actual daily data
// rows, where a blank legitimately means "no value recorded that day."
function buildEffectiveHeaderRow(grid: SheetGrid, r: number, lookback = 3): string[] {
  const row = grid[r] || [];
  const width = Math.max(row.length, ...grid.slice(Math.max(0, r - lookback), r + 1).map((rr) => (rr ? rr.length : 0)));
  const effective: string[] = [];
  for (let c = 0; c < width; c++) {
    let val = row[c];
    if (isBlank(val)) {
      for (let back = 1; back <= lookback; back++) {
        const above = grid[r - back]?.[c];
        if (!isBlank(above)) {
          val = above;
          break;
        }
      }
    }
    effective[c] = val || "";
  }
  return effective;
}

// Locates the header row containing the detailed daily-table column labels.
// We require at least "day" and "trials" (or "revTotal") to match to avoid
// false-positiving on unrelated rows. Also returns how many columns were
// labeled "DAY" (usually 1, sometimes 2 — weekday text + day number) since
// summary/totals rows elsewhere in the sheet may only use a single label
// cell, shifting every column after it — see findMonthlyTotalsRow.
function findHeaderRow(
  grid: SheetGrid,
  maxScanRows: number
): { rowIndex: number; columnMap: Record<string, number>; dayLabelColumnCount: number } | null {
  for (let r = 0; r < Math.min(maxScanRows, grid.length); r++) {
    // Scan the merge-filled version of the row so a vertically-merged "DAY"
    // header (reported only on an earlier row by the Sheets API) is still
    // seen as part of this row's column map.
    const row = buildEffectiveHeaderRow(grid, r);
    const columnMap: Record<string, number> = {};
    const dayCandidates: number[] = [];
    row.forEach((cellText, c) => {
      if (!cellText) return;
      const key = findAliasKey(cellText);
      if (!key) return;
      if (key === "day") {
        dayCandidates.push(c);
        return;
      }
      if (columnMap[key] === undefined) columnMap[key] = c;
    });
    if (dayCandidates.length > 0) {
      const dayCol = pickDayNumberColumn(grid, r, dayCandidates);
      if (dayCol !== undefined) columnMap.day = dayCol;
    }
    if (columnMap.day !== undefined && (columnMap.trials !== undefined || columnMap.revTotal !== undefined)) {
      return { rowIndex: r, columnMap, dayLabelColumnCount: dayCandidates.length || 1 };
    }
  }
  return null;
}

// Finds the row index of a section marker (e.g. "DOWNTOWN") occurring after
// the header row, used to bound where the Downtown daily rows begin/end.
function findSectionBounds(grid: SheetGrid, headerRowIndex: number): { start: number; end: number } {
  let start = headerRowIndex + 1;
  let end = grid.length;
  for (let r = headerRowIndex; r < grid.length; r++) {
    const rowText = (grid[r] || []).join(" ").toUpperCase();
    if (rowText.includes("DOWNTOWN") && r > headerRowIndex - 1) {
      start = r + 1;
      break;
    }
  }
  for (let r = start; r < grid.length; r++) {
    const rowText = (grid[r] || []).join(" ").toUpperCase();
    if (rowText.includes("MIDTOWN")) {
      end = r;
      break;
    }
    // A row containing "TOTAL" (e.g. a "TOTALS" or "MONTHLY TOTALS" row) is
    // itself the row findMonthlyTotalsRow needs to read — it must stay
    // inside the range, not be excluded by treating it as the boundary.
    // Only genuinely non-data markers (like "MIDTOWN") should cut the range
    // off *before* themselves.
    if (rowText.includes("TOTAL")) {
      end = r + 1;
      break;
    }
  }
  return { start, end };
}

export type MonthlyTotalsRow = Partial<Record<string, number>>;

// The spreadsheet maintains its own "TOTALS" row (per the TEMPLATE tab's
// "MONTHLY TOTALS" section) computed by its own formulas. That row is the
// authoritative source for monthly counts — prefer it over summing daily
// rows ourselves, since totals can include corrections/adjustments that a
// naive day-by-day sum would miss. Only fields present (non-blank) in the
// TOTALS row are returned; callers fall back to unavailable for anything
// not found here.
//
// Column-alignment caveat (confirmed on the live sheet): the header row can
// have TWO "DAY" label columns (weekday text + day number), but the TOTALS
// row typically has only ONE label cell ("TOTALS"). That means every column
// after it is shifted left by (dayLabelColumnCount - 1) relative to the
// header's column map. Rather than assume a fixed shift, we try a small set
// of plausible shifts and keep whichever parses the most fields — self
// -correcting instead of hardcoding one sheet's exact layout.
//
// Second alignment caveat (confirmed on the live sheet, same root cause as
// the header's merged DAY cell): the "TOTALS" text and its numeric values
// can live on DIFFERENT rows — the label sits alone on one row, and the
// actual per-column totals (e.g. Trials at I, CP-to-Trials at J) are one row
// above or below it, rather than on the exact same row as the label. So for
// every row that merely CONTAINS the word "TOTAL", we score not just that
// row but also the row directly above and below it, and keep whichever
// (row, shift) combination actually parses the most fields — never assuming
// the label and its values share a row.
function findMonthlyTotalsRow(
  grid: SheetGrid,
  header: { rowIndex: number; columnMap: Record<string, number>; dayLabelColumnCount: number },
  sectionStart: number,
  sectionEnd: number
): { totals: MonthlyTotalsRow; rowIndex: number } | null {
  const candidateShifts = Array.from(new Set([0, header.dayLabelColumnCount - 1, -(header.dayLabelColumnCount - 1)]));

  // Scores every (shift) combination for a single candidate row and returns
  // whichever shift parsed the most fields for that row alone.
  function scoreRow(row: string[]): { totals: MonthlyTotalsRow; score: number } {
    let best: MonthlyTotalsRow = {};
    let bestScore = 0;
    for (const shift of candidateShifts) {
      const totals: MonthlyTotalsRow = {};
      let score = 0;
      for (const [key, col] of Object.entries(header.columnMap)) {
        if (key === "day") continue;
        const raw = row[col - shift];
        if (isBlank(raw)) continue;
        const parsed = parseByKind(fieldKind(key), raw);
        if (parsed.value !== null) {
          totals[key] = parsed.value;
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = totals;
      }
    }
    return { totals: best, score: bestScore };
  }

  // Scan a wider label window (not just the day-label columns) and match on
  // "TOTAL" as a substring rather than an exact "TOTALS" string — real
  // sheets use varying phrasing ("TOTALS", "MONTHLY TOTALS", "TOTAL") and,
  // per the same merged-cell behavior handled in findHeaderRow, the label
  // may not land in the exact column the day-header occupied.
  for (let r = sectionStart; r < Math.min(sectionEnd, grid.length); r++) {
    const labelRow = grid[r] || [];
    const isTotalsRow = labelRow.slice(0, 8).some((c) => (c || "").trim().toUpperCase().includes("TOTAL"));
    if (!isTotalsRow) continue;

    // Try the label row itself FIRST, and only fall through to its
    // immediate neighbors if the label row alone has no parseable values.
    // A daily data row can coincidentally score "higher" (more populated
    // cells) than a genuine totals row that intentionally leaves several
    // columns blank — so neighbors must never outbid a label row that
    // already produced a real (nonzero) result.
    for (const rowOffset of [0, 1, -1]) {
      const { totals, score } = scoreRow(grid[r + rowOffset] || []);
      if (score > 0) return { totals, rowIndex: r + rowOffset };
    }
    // This "TOTAL"-labeled row and its immediate neighbors were all empty —
    // keep scanning in case it was a stray mention (e.g. a header label)
    // rather than the actual totals block.
  }

  return null;
}

// PSC total (P47) and PSC revenue (Q47) confirmed directly by the business.
// This is only a safety net: if label-based matching already found "psc"/
// "pscRev" on the totals row, those values are trusted as-is. It's only
// consulted for whichever of the two fields label matching missed, reading
// the exact confirmed column on the same totals row already located — a
// direct read, not a guess or a calculation.
function applyPscFallback(grid: SheetGrid, totals: MonthlyTotalsRow, totalsRowIndex: number, diagnostics: DiagnosticsEntry[]): MonthlyTotalsRow {
  const row = grid[totalsRowIndex] || [];
  const result = { ...totals };
  if (typeof result.psc !== "number") {
    const raw = row[PSC_TOTALS_FALLBACK.pscColumn.col];
    const parsed = isBlank(raw) ? { value: null } : parseNumber(raw);
    if (parsed.value !== null) {
      result.psc = parsed.value;
      diagnostics.push({
        metric: "pscMTD",
        label: "PSC",
        resolvedVia: "fallback",
        sourceCell: PSC_TOTALS_FALLBACK.pscColumn.ref + (totalsRowIndex + 1),
        warning: "PSC not found by label on the TOTALS row; read directly from the confirmed column P instead.",
      });
    }
  }
  if (typeof result.pscRev !== "number") {
    const raw = row[PSC_TOTALS_FALLBACK.pscRevColumn.col];
    const parsed = isBlank(raw) ? { value: null } : parseCurrency(raw);
    if (parsed.value !== null) {
      result.pscRev = parsed.value;
      diagnostics.push({
        metric: "pscRevMTD",
        label: "PSC REV",
        resolvedVia: "fallback",
        sourceCell: PSC_TOTALS_FALLBACK.pscRevColumn.ref + (totalsRowIndex + 1),
        warning: "PSC REV not found by label on the TOTALS row; read directly from the confirmed column Q instead.",
      });
    }
  }
  return result;
}

// Forward MRR forecast: no reliable label exists for these three columns,
// so they're read by the exact confirmed absolute column position (AG, AH,
// AI). Each is a running snapshot like NO VISIT LAST 7 — take the last
// non-blank value posted in that column across the daily rows, not a sum.
export type MrrForecast = {
  plus1: number | null;
  plus2: number | null;
  plus3: number | null;
  plus1Previous: number | null;
  plus2Previous: number | null;
  plus3Previous: number | null;
};

// Same running-snapshot read used for NO VISIT LAST 7, but also returns the
// entry posted immediately before the latest one (i.e. the prior day's
// snapshot of the same AG/AH/AI column) so the UI can show a day-over-day
// trend arrow. Still a plain read of two already-posted cells — no math
// beyond "is the second one bigger than the first."
function latestTwoValuesInColumn(
  grid: SheetGrid,
  start: number,
  end: number,
  col: number
): { latest: number | null; previous: number | null } {
  let latest: number | null = null;
  for (let r = Math.min(end, grid.length) - 1; r >= start; r--) {
    const raw = (grid[r] || [])[col];
    if (isBlank(raw)) continue;
    const parsed = parseCurrency(raw);
    if (parsed.value === null) continue;
    if (latest === null) {
      latest = parsed.value;
      continue;
    }
    return { latest, previous: parsed.value };
  }
  return { latest, previous: null };
}

export function parseDailyTable(
  grid: SheetGrid,
  daysInMonth: number,
  todayDayOfMonth: number,
  isoDateForDay: (day: number) => string,
  diagnostics: DiagnosticsEntry[],
  warnings: string[]
): { daily: DailyPerformance[]; monthlyTotals: MonthlyTotalsRow | null; mrrForecast: MrrForecast } {
  const emptyMrrForecast: MrrForecast = {
    plus1: null,
    plus2: null,
    plus3: null,
    plus1Previous: null,
    plus2Previous: null,
    plus3Previous: null,
  };
  const header = findHeaderRow(grid, 20);
  if (!header) {
    warnings.push("Could not locate the daily table header row by label search. Daily performance data is unavailable.");
    return { daily: [], monthlyTotals: null, mrrForecast: emptyMrrForecast };
  }
  diagnostics.push({
    metric: "dailyTable.headerRow",
    label: "header row",
    resolvedVia: "label",
    sourceCell: `row ${header.rowIndex + 1}`,
  });

  const cpToTrialsCol = header.columnMap.cpToTrials;
  if (cpToTrialsCol === undefined) {
    diagnostics.push({
      metric: "dailyTable.cpToTrials",
      label: "CP TO TRIALS",
      resolvedVia: "fallback",
      sourceCell: DAILY_TABLE_FALLBACK.cpToTrialsColumn.ref,
      warning: "CP TO TRIALS column not found by label; falling back to approximate column position.",
    });
  }

  const { start, end } = findSectionBounds(grid, header.rowIndex);
  const results: DailyPerformance[] = [];

  function getVal(row: string[], key: string): { value: number | null; warning?: string } {
    const col = header!.columnMap[key];
    if (col === undefined) return { value: null };
    const raw = row[col];
    if (isBlank(raw)) return { value: null };
    return parseByKind(fieldKind(key), raw);
  }

  for (let r = start; r < Math.min(end, grid.length); r++) {
    const row = grid[r] || [];
    const dayRaw = row[header.columnMap.day];
    if (isBlank(dayRaw)) continue;
    const dayParsed = parseNumber(dayRaw);
    if (dayParsed.value === null) continue;
    const dayOfMonth = dayParsed.value;
    if (dayOfMonth < 1 || dayOfMonth > daysInMonth) continue;

    const grossRevenue = getVal(row, "grossRevenue");
    const revTotal = getVal(row, "revTotal");
    const pretax = getVal(row, "pretax");
    const trials = getVal(row, "trials");
    const cpToTrials = getVal(row, "cpToTrials");
    const booked = getVal(row, "booked");
    const show = getVal(row, "show");
    const newMemberships = getVal(row, "newMemberships");
    const classPacks = getVal(row, "classPacks");
    const pt = getVal(row, "pt");
    const totalSales = getVal(row, "totalSalesCol");
    const utilization = getVal(row, "utilization");
    const visits = getVal(row, "visits");
    const frozen = getVal(row, "frozen");
    const terminations = getVal(row, "terminations");
    const revLost = getVal(row, "revLost");
    const noVisitLast7 = getVal(row, "noVisitLast7");
    const bookedRev = getVal(row, "bookedRevCol");

    const isToday = dayOfMonth === todayDayOfMonth;
    // A row counts as "complete" if it has at least a revenue total recorded;
    // today's row in particular may be genuinely in-progress with blanks.
    const isComplete = !isToday || revTotal.value !== null || grossRevenue.value !== null;

    results.push({
      date: isoDateForDay(dayOfMonth),
      dayOfMonth,
      isToday,
      isComplete,
      grossRevenue: grossRevenue.value,
      revenueTotal: revTotal.value,
      pretaxRevenue: pretax.value,
      trials: trials.value,
      cpToTrials: cpToTrials.value,
      booked: booked.value,
      show: show.value,
      newMemberships: newMemberships.value,
      classPacks: classPacks.value,
      pt: pt.value,
      totalSales: totalSales.value,
      utilization: utilization.value,
      visits: visits.value,
      frozen: frozen.value,
      terminations: terminations.value,
      revenueLost: revLost.value,
      noVisitLast7: noVisitLast7.value,
      bookedRevenue: bookedRev.value,
    });
  }

  const totalsResult = findMonthlyTotalsRow(grid, header, start, end);
  let monthlyTotals: MonthlyTotalsRow | null = null;
  if (totalsResult) {
    monthlyTotals = applyPscFallback(grid, totalsResult.totals, totalsResult.rowIndex, diagnostics);
    diagnostics.push({
      metric: "dailyTable.monthlyTotalsRow",
      label: "TOTALS",
      resolvedVia: "totalsRow",
      warning: `Found spreadsheet TOTALS row; using it in preference to summing daily rows for: ${Object.keys(monthlyTotals).join(", ") || "(no fields)"}.`,
    });
  } else {
    // Surfaced in ?debug=1 so a future "TOTALS row not found" case is
    // diagnosable from the panel alone, without another round of screenshots.
    warnings.push(
      `Could not locate a "TOTALS" row between rows ${start + 1} and ${Math.min(end, grid.length)} (section scanned after the header at row ${
        header.rowIndex + 1
      }). Trials/CP-to-Trials/New Memberships/PSC MTD will show as unavailable until this is found.`
    );
  }

  // Forward MRR forecast (AG/AH/AI) — absolute-column reads, independent of
  // the TOTALS row entirely, since these are running snapshots rather than
  // monthly totals (see latestValueInColumn's doc comment above).
  const plus1Snapshot = latestTwoValuesInColumn(grid, start, end, MRR_FORECAST_COLUMNS.plus1.col);
  const plus2Snapshot = latestTwoValuesInColumn(grid, start, end, MRR_FORECAST_COLUMNS.plus2.col);
  const plus3Snapshot = latestTwoValuesInColumn(grid, start, end, MRR_FORECAST_COLUMNS.plus3.col);
  const mrrForecast: MrrForecast = {
    plus1: plus1Snapshot.latest,
    plus2: plus2Snapshot.latest,
    plus3: plus3Snapshot.latest,
    plus1Previous: plus1Snapshot.previous,
    plus2Previous: plus2Snapshot.previous,
    plus3Previous: plus3Snapshot.previous,
  };
  diagnostics.push({
    metric: "mrrForecast",
    label: "MRR forecast (AG/AH/AI)",
    resolvedVia: "fallback",
    sourceCell: "AG/AH/AI",
    warning: `Latest posted value read directly from confirmed columns AG, AH, AI (no label match attempted). Found: ${
      [mrrForecast.plus1, mrrForecast.plus2, mrrForecast.plus3].filter((v) => v !== null).length
    }/3.`,
  });

  return { daily: results, monthlyTotals, mrrForecast };
}
