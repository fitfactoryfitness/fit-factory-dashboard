import { SheetGrid } from "@/lib/googleSheets/client";

// Synthetic grid shaped like the real JUL tab, built from the values
// confirmed during spreadsheet discovery (revenue goal $85,000, revenue MTD
// $52,785.61, projected $77,090.61, gap -$7,909.39, etc.), used by
// MockDashboardProvider so the UI/parsing pipeline can be developed and
// tested without live Google credentials. Row/col positions here are
// illustrative — the parser must resolve by label, not by hardcoded index,
// which this mock also exercises.
export function buildMockJulGrid(): SheetGrid {
  const rows: string[][] = [];
  const row = (...cells: (string | number)[]) => rows.push(cells.map((c) => String(c)));

  row("", "7/20/2026", "DAILY REPORT SUMMARY", "", "", "", "", "", "", "", "", "", "", "", "", "");
  row("DOWNTOWN", "BOOKED REVENUE", "$24,305.00", "", "", "", "", "MIDTOWN", "BOOKED REVENUE", "$6,567.00");
  row("Membership Start", "262", "REVENUE GOAL", "$85,000", "", "", "", "Membership Start", "213", "REVENUE TARGET", "$55,000");
  row("Utilization Goal", "70%", "REVENUE MTD", "$52,785.61", "", "", "", "Utilization Goal", "50%", "REVENUE MTD", "$27,408.67");
  row("Attrition Goal", "5%", "PROJECTED REVENUE", "$77,090.61", "", "", "", "Attrition Goal", "<5", "GAP TO GOAL - MONTH", "-$27,591.33");
  row("Total Sales", "53", "GAP TO GOAL - MONTH", "-$7,909.39", "", "", "", "Net New Sales", "12", "GAP TO GOAL - DAILY", "-$1,240.00");
  row("DAYS 1-7", "DAYS 8-14", "DAYS 15-21", "DAYS 21+", "", "", "", "DAYS 1-7", "DAYS 8-14", "DAYS 15-21", "DAYS 21+");
  row("$22,731.32", "$16,681.56", "$13,372.73", "$0.00", "", "", "", "$11,502.41", "$15,906.26", "$0.00", "$0.00");
  row("PREVIOUS MONTH", "", "", "", "", "", "", "PREVIOUS MONTH");
  row("BUSINESS PERFORMANCE", "", "", "", "", "BUSINESS EXPOSURE & GROWTH", "", "", "", "STUDIO");
  row(
    "DAY", "GROSS REVENUE", "MEMBERSHIPS", "CREDITS", "PENALTY FEES", "MISC", "REV TOTAL", "PRETAX",
    "TRIALS", "CP TO TRIALS", "BOOKED", "SHOW", "NEW MEMBERSHIPS", "CLASS PACKS", "PT", "PSC", "PSC REV",
    "DEPOSIT", "TOTAL SALES", "REFINED REV", "UTILIZATION", "VISTS", "PSC VISITS", "PSC %", "CP VISITS",
    "CP %", "CP REV", "FROZEN", "TERMINATIONS", "REV LOST", "NO VISIT LAST 7", "BOOKED REV",
    // Columns AG/AH/AI (index 32-34): forward MRR forecast for the next 1/2/3
    // months. No reliable label exists for these on the live sheet, so the
    // parser reads them by absolute column position, not by matching this
    // text — these labels are illustrative only.
    "MRR", "MRR +1 MO", "MRR +2 MO"
  );
  row("DOWNTOWN", "DOWNTOWN");

  // 19 complete days + day 20 (today, in progress with some blanks)
  const dailyRevenue = [
    2870, 3100, 2650, 3400, 2980, 1500, 1200, 3550, 3720, 2400, 2600, 3900, 4100, 1300, 1450, 3300, 3550, 3700, 2200,
  ];
  let trialsCum = 0;
  let cpCum = 0;
  for (let day = 1; day <= 19; day++) {
    const gross = dailyRevenue[day - 1];
    const trials = day % 4 === 0 ? 2 : day % 3 === 0 ? 1 : 0;
    const cp = day % 5 === 0 ? 1 : 0;
    trialsCum += trials;
    cpCum += cp;
    // NOTE: this mock month is illustrative shape only, not a snapshot of
    // real sheet values — the live sheet is actively being edited, so
    // pinning specific demo days to specific real numbers goes stale
    // immediately. Column H (PRETAX) is the authoritative daily revenue
    // figure used throughout the app; REV TOTAL (column G) is a separate,
    // different figure and is never substituted for it.
    row(
      day, gross.toFixed(2), (gross * 0.6).toFixed(2), "0.00", "0.00", "0.00", (gross * 1.02).toFixed(2),
      (gross * 0.75).toFixed(2), trials, cp, trials + 1, trials, day % 6 === 0 ? 1 : 0, day % 7 === 0 ? 1 : 0,
      0, 0, "$0.00", "$0.00", (gross * 1.05).toFixed(2), (gross * 0.7).toFixed(2), "68%", day % 9 === 0 ? "" : 45 + day,
      0, "0%", 2, "10%", "$0.00", 0, day === 11 ? 1 : 0, "$0.00", 0, day === 19 ? "24,305.00" : "0.00", 51000 + day * 10,
      // MRR +1/+2 mo forecast columns: blank until first posted, mirroring
      // how these running snapshots behave on the live sheet (only the
      // LATEST posted value is used for the headline figure). Day 18's entry
      // is included too, purely so the mock exercises the day-over-day trend
      // arrow in both directions (+2 mo trends up here, +3 mo trends down) —
      // day 19 stays the values the smoke test asserts on.
      day === 19 ? "58200.00" : day === 18 ? "58150.00" : "",
      day === 19 ? "61500.00" : day === 18 ? "61550.00" : ""
    );
  }
  // Day 20: today, in progress — deliberately sparse to test blank handling.
  row(20, "1,883.43", "", "", "", "", "", "", 3, "", "460.00", 3, "", "", "", "", "", "", "", "", "52%", "", "", "", "", "", "", "", "", "", "", "", "", "", "");

  // Spreadsheet's own MONTHLY TOTALS / TOTALS row for Downtown. Per strict
  // read-only policy, this is the ONLY source for monthly figures — nothing
  // is summed from the daily rows above. Column positions match the header
  // row (index 0 = DAY ... index 34 = AI/MRR +2 mo); named here for clarity.
  const totalsRow = new Array(35).fill("");
  totalsRow[0] = "TOTALS";
  totalsRow[7] = "52785.61"; // PRETAX total = Revenue MTD (matches H47 in the live sheet)
  totalsRow[8] = 33; // TRIALS
  totalsRow[9] = 7; // CP TO TRIALS
  totalsRow[12] = 15; // NEW MEMBERSHIPS
  totalsRow[15] = 4; // PSC (matches confirmed P47 on the live sheet)
  totalsRow[16] = "620.00"; // PSC REV (matches confirmed Q47 on the live sheet)
  totalsRow[18] = 53; // TOTAL SALES
  totalsRow[20] = "67%"; // UTILIZATION (average)
  totalsRow[28] = 1; // TERMINATIONS
  // REV LOST (index 29) deliberately left blank — exercises the
  // "unavailable, not estimated" path when a field has no TOTALS-row entry.
  row(...totalsRow);

  row("MIDTOWN", "MIDTOWN");
  for (let day = 1; day <= 20; day++) {
    row(day, "1200.00", "700.00", "0.00", "0.00", "0.00", "1220.00", "900.00", 1, 0, 2, 1, 0, 0, 0, 0, "$0.00", "$0.00", "1250.00", "850.00", "50%", 20, 0, "0%", 1, "5%", "$0.00", 0, 0, "$0.00", 0, "$0.00", 27000);
  }

  row("MONTHLY TOTALS", "MONTHLY TOTALS");
  return rows;
}
