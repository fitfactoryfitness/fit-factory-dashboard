import { describe, it, expect } from "vitest";
import { parseDailyTable } from "@/lib/spreadsheetParser/dailyTableParser";
import { DiagnosticsEntry } from "@/types/dashboard";

const isoForDay = (day: number) => `2026-07-${String(day).padStart(2, "0")}`;

describe("dailyTableParser — label-based, order-independent", () => {
  it("parses a standard header layout and distinguishes blank vs zero for today's row", () => {
    const grid = [
      ["DAY", "GROSS REVENUE", "REV TOTAL", "TRIALS", "CP TO TRIALS", "UTILIZATION"],
      ["DOWNTOWN"],
      ["1", "$1,000.00", "$1,020.00", "2", "1", "60%"],
      ["2", "$0.00", "$0.00", "0", "0", "0%"],
      ["3", "$500.00", "", "1", "", ""], // in-progress "today" row: blanks, not zeros
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { daily } = parseDailyTable(grid, 31, 3, isoForDay, diagnostics, warnings);

    expect(daily).toHaveLength(3);
    expect(daily[1].grossRevenue).toBe(0); // explicit zero preserved, not treated as blank
    expect(daily[2].isToday).toBe(true);
    expect(daily[2].revenueTotal).toBeNull(); // blank stays null, not coerced to 0
    expect(daily[2].utilization).toBeNull();
  });

  it("resolves the same metrics correctly when columns are reordered", () => {
    const reordered = [
      ["DAY", "TRIALS", "CP TO TRIALS", "REV TOTAL", "GROSS REVENUE", "UTILIZATION"],
      ["DOWNTOWN"],
      ["1", "3", "1", "$1,020.00", "$1,000.00", "70%"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { daily } = parseDailyTable(reordered, 31, 1, isoForDay, diagnostics, warnings);
    expect(daily[0].trials).toBe(3);
    expect(daily[0].cpToTrials).toBe(1);
    expect(daily[0].grossRevenue).toBe(1000);
    expect(daily[0].utilization).toBe(70);
  });

  it("handles a missing CP TO TRIALS column without crashing, flags it in diagnostics", () => {
    const grid = [
      ["DAY", "GROSS REVENUE", "REV TOTAL", "TRIALS"],
      ["DOWNTOWN"],
      ["1", "$1,000.00", "$1,020.00", "2"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { daily } = parseDailyTable(grid, 31, 1, isoForDay, diagnostics, warnings);
    expect(daily[0].cpToTrials).toBeNull();
    expect(diagnostics.some((d) => d.metric === "dailyTable.cpToTrials")).toBe(true);
  });

  it("returns an empty array with a warning when the header row cannot be located at all", () => {
    const grid = [["not", "a", "header", "row"], ["still", "nothing"]];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { daily } = parseDailyTable(grid, 31, 1, isoForDay, diagnostics, warnings);
    expect(daily).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("handles formula errors in a daily row (e.g. #DIV/0! on utilization) without throwing", () => {
    const grid = [
      ["DAY", "GROSS REVENUE", "REV TOTAL", "UTILIZATION"],
      ["DOWNTOWN"],
      ["1", "$0.00", "$0.00", "#DIV/0!"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    expect(() => parseDailyTable(grid, 31, 1, isoForDay, diagnostics, warnings)).not.toThrow();
    const { daily } = parseDailyTable(grid, 31, 1, isoForDay, diagnostics, warnings);
    expect(daily[0].utilization).toBeNull();
  });

  it("prefers the spreadsheet's own TOTALS row over summing daily rows", () => {
    const grid = [
      ["DAY", "GROSS REVENUE", "REV TOTAL", "TRIALS", "CP TO TRIALS"],
      ["DOWNTOWN"],
      ["1", "$1,000.00", "$1,020.00", "1", "0"],
      ["2", "$1,000.00", "$1,020.00", "1", "0"],
      // Daily rows sum to 2 trials, but the sheet's own TOTALS row says 33 —
      // trust the spreadsheet's total, since it can include corrections a
      // naive daily sum would miss.
      ["TOTALS", "", "", "33", "7"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { monthlyTotals } = parseDailyTable(grid, 31, 2, isoForDay, diagnostics, warnings);
    expect(monthlyTotals?.trials).toBe(33);
    expect(monthlyTotals?.cpToTrials).toBe(7);
    expect(diagnostics.some((d) => d.metric === "dailyTable.monthlyTotalsRow")).toBe(true);
  });

  it("falls back to null monthlyTotals when no TOTALS row exists", () => {
    const grid = [
      ["DAY", "GROSS REVENUE", "REV TOTAL", "TRIALS"],
      ["DOWNTOWN"],
      ["1", "$1,000.00", "$1,020.00", "1"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { monthlyTotals } = parseDailyTable(grid, 31, 1, isoForDay, diagnostics, warnings);
    expect(monthlyTotals).toBeNull();
  });

  it("resolves the correct day-of-month column when the sheet has two DAY-labeled columns (real-world layout: weekday text + day number)", () => {
    // This exact ambiguity was confirmed on the live sheet: column A is the
    // weekday abbreviation ("SUN"), column B is the actual day-of-month
    // number, and both cells are labeled "DAY" in the header row. Picking
    // the first "DAY" match (the weekday text) would make every row
    // unparseable and silently return an empty daily array.
    const grid = [
      ["DAY", "DAY", "MEMBERSHIPS", "REV TOTAL", "PRETAX (FF)", "TRIALS", "CP TO TRIALS"],
      ["DOWNTOWN"],
      ["WED", "1", "$2,121.29", "$4,624.69", "$3,843.65", "0", "0"],
      ["THU", "2", "$2,932.35", "$7,599.18", "$5,918.05", "4", "0"],
      ["FRI", "3", "$550.31", "$4,504.18", "$3,638.00", "2", "0"],
      ["SUN", "5", "$1,263.34", "$2,019.32", "$1,588.01", "1", "0"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { daily } = parseDailyTable(grid, 31, 3, isoForDay, diagnostics, warnings);

    // If the weekday-text column had been picked as "day", this would be [].
    expect(daily.length).toBeGreaterThan(0);
    const day1 = daily.find((d) => d.dayOfMonth === 1);
    expect(day1?.pretaxRevenue).toBeCloseTo(3843.65, 2);
  });

  it("self-corrects a column shift in the TOTALS row when it has only one label cell instead of two", () => {
    // Real-world regression: header has TWO "DAY" columns (weekday + day
    // number), but the TOTALS row has only ONE label cell ("TOTALS"), so
    // every value after it lands one column to the left of where the
    // header's column map expects it. This must self-correct without
    // hardcoding a fixed shift.
    const grid = [
      ["DAY", "DAY", "MEMBERSHIPS", "REV TOTAL", "PRETAX (FF)", "TRIALS", "CP TO TRIALS"],
      ["DOWNTOWN"],
      ["WED", "1", "$2,121.29", "$4,624.69", "$3,843.65", "0", "0"],
      ["THU", "2", "$2,932.35", "$7,599.18", "$5,918.05", "4", "0"],
      // Only one "TOTALS" cell, so MEMBERSHIPS/REV TOTAL/PRETAX/TRIALS/CP
      // are all shifted one column left relative to the header map.
      ["TOTALS", "$5,053.64", "$12,223.87", "$9,761.65", "4", "0", ""],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { monthlyTotals } = parseDailyTable(grid, 31, 2, isoForDay, diagnostics, warnings);
    expect(monthlyTotals?.trials).toBe(4);
    expect(monthlyTotals?.pretax).toBeCloseTo(9761.65, 2);
  });

  it("finds the header row when the DAY label is vertically merged one row above the rest of the column labels (real-world layout)", () => {
    // Confirmed root cause of the live "Could not locate the daily table
    // header row" bug: Google Sheets' values.get API reports a merged cell's
    // text ONLY in the merge's top-left cell — it is never duplicated across
    // the cells the merge visually spans. The real sheet's header band is two
    // rows tall: a group-label row, then a specific-label row ("MEMBERSHIPS",
    // "TRIALS", "REV TOTAL", ...). The "DAY" column doesn't need a group
    // label, so its header cell is merged vertically across both rows — the
    // API reports "DAY" only on the row ABOVE the specific-label row, leaving
    // the specific-label row's own DAY cell blank. A naive single-row scan
    // never finds a row containing both "day" and "trials"/"revTotal", so it
    // returns null and the whole daily table silently disappears.
    const grid = [
      ["DAY", "", "BUSINESS PERFORMANCE", "", "", ""],
      ["", "", "MEMBERSHIPS", "REV TOTAL", "PRETAX (FF)", "TRIALS"],
      ["DOWNTOWN"],
      ["1", "", "$2,121.29", "$4,624.69", "$3,843.65", "0"],
      ["2", "", "$2,932.35", "$7,599.18", "$5,918.05", "4"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { daily } = parseDailyTable(grid, 31, 2, isoForDay, diagnostics, warnings);

    // Header-row detection itself must succeed (no "could not locate the
    // header row" warning) — this fixture has no TOTALS row, so a separate
    // "TOTALS row not found" warning is expected and fine.
    expect(warnings.some((w) => w.includes("locate the daily table header row"))).toBe(false);
    expect(daily.length).toBeGreaterThan(0);
    const day2 = daily.find((d) => d.dayOfMonth === 2);
    expect(day2?.pretaxRevenue).toBeCloseTo(5918.05, 2);
    expect(day2?.trials).toBe(4);
  });

  it("widens TOTALS-row matching to substrings and a wider column window (real sheets vary phrasing/placement)", () => {
    const grid = [
      ["DAY", "DAY", "MEMBERSHIPS", "REV TOTAL", "PRETAX (FF)", "TRIALS", "CP TO TRIALS"],
      ["DOWNTOWN"],
      ["WED", "1", "$2,121.29", "$4,624.69", "$3,843.65", "0", "0"],
      // "MONTHLY TOTALS" (not exactly "TOTALS") in column 2, not column 0/1 —
      // both variations a naive exact-match/narrow-window check would miss.
      ["", "", "MONTHLY TOTALS", "$4,624.69", "$3,843.65", "4", "1"],
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { monthlyTotals } = parseDailyTable(grid, 31, 1, isoForDay, diagnostics, warnings);
    expect(monthlyTotals?.trials).toBe(4);
    expect(monthlyTotals?.cpToTrials).toBe(1);
  });

  it("finds TOTALS values on the row above/below the TOTALS label itself (real-world layout: label and numbers split across rows)", () => {
    // Confirmed on the live sheet: the word "TOTALS" appears alone on one
    // row (no numbers next to it), and the actual per-column totals — e.g.
    // Trials at column I, CP TO TRIALS at column J — are on the row right
    // below it. A same-row-only read finds the label but zero numbers.
    const grid = [
      ["DAY", "DAY", "MEMBERSHIPS", "REV TOTAL", "PRETAX (FF)", "TRIALS", "CP TO TRIALS"],
      ["DOWNTOWN"],
      ["WED", "1", "$2,121.29", "$4,624.69", "$3,843.65", "0", "0"],
      ["THU", "2", "$2,932.35", "$7,599.18", "$5,918.05", "4", "0"],
      ["TOTALS"], // label-only row, no values
      ["", "", "$5,053.64", "$12,223.87", "$9,761.65", "4", "1"], // values one row below
      ["MIDTOWN"],
    ];
    const diagnostics: DiagnosticsEntry[] = [];
    const warnings: string[] = [];
    const { monthlyTotals } = parseDailyTable(grid, 31, 2, isoForDay, diagnostics, warnings);
    expect(monthlyTotals?.trials).toBe(4);
    expect(monthlyTotals?.cpToTrials).toBe(1);
    expect(monthlyTotals?.pretax).toBeCloseTo(9761.65, 2);
  });
});
