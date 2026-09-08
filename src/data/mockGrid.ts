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
    // Columns AH/AI/AJ (index 33-35): forward MRR forecast for the next
    // 1/2/3 months (shifted right by one column on the live sheet as of
    // 2026-09-08; was AG/AH/AI). No reliable label exists for these on the
    // live sheet, so the parser reads them by absolute column position, not
    // by matching this text — these labels are illustrative only. Index 32
    // ("MRR") is now an unused spacer column, left over from before the
    // shift.
    "MRR", "MRR +1 MO", "MRR +2 MO", "MRR +3 MO"
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
      0, "0%", 2, "10%", "$0.00", 0, day === 11 ? 1 : 0, "$0.00", 0, day === 19 ? "24,305.00" : "0.00",
      "", // unused spacer column (formerly the forecast base before the AG->AH shift)
      // MRR +1/+2/+3 mo forecast columns: blank until first posted, mirroring
      // how these running snapshots behave on the live sheet (only the
      // LATEST posted value is used for the headline figure). Day 18's entry
      // is included too, purely so the mock exercises the day-over-day trend
      // arrow in both directions (+1/+2 mo trend up here, +3 mo trends down) —
      // day 19 stays the values the smoke test asserts on.
      day === 19 ? "55200.00" : day === 18 ? "55150.00" : "",
      day === 19 ? "58200.00" : day === 18 ? "58150.00" : "",
      day === 19 ? "61500.00" : day === 18 ? "61550.00" : ""
    );
  }
  // Day 20: today, in progress — deliberately sparse to test blank handling.
  row(20, "1,883.43", "", "", "", "", "", "", 3, "", "460.00", 3, "", "", "", "", "", "", "", "", "52%", "", "", "", "", "", "", "", "", "", "", "", "", "", "");

  // Spreadsheet's own MONTHLY TOTALS / TOTALS row for Downtown. Per strict
  // read-only policy, this is the ONLY source for monthly figures — nothing
  // is summed from the daily rows above. Column positions match the header
  // row (index 0 = DAY ... index 35 = AJ/MRR +3 mo); named here for clarity.
  const totalsRow = new Array(36).fill("");
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

const MONTH_ORDER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Synthetic grid for any month OTHER than JUL, used only when the user picks
// a different month in the UI (month selector / compare panel) while running
// against mock data (no live Google credentials configured). Deliberately a
// SEPARATE function from buildMockJulGrid() above — that one's exact values
// are asserted on by the smoke test and must never change. This generator
// reuses the identical header/label layout (so the real label-search parser
// is exercised the same way it is against a live sheet), but produces
// numerically distinct, deterministic (not random) data per month so
// switching months in local dev actually looks different month to month —
// it is illustrative only, not a snapshot of any real month.
export function buildMockGridForMonth(monthTab: string, year: number): SheetGrid {
  const monthIndex = MONTH_ORDER.indexOf(monthTab);
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const seed = 0.7 + monthIndex * 0.04; // mild seasonal growth JAN -> DEC, deterministic per month

  const rows: string[][] = [];
  const row = (...cells: (string | number)[]) => rows.push(cells.map((c) => String(c)));

  const revenueGoal = Math.round(80000 * seed);

  row("", `${monthTab} ${year}`, "DAILY REPORT SUMMARY");
  row("DOWNTOWN", "BOOKED REVENUE", `$${Math.round(22000 * seed).toLocaleString()}.00`);
  row("Membership Start", "260", "REVENUE GOAL", `$${revenueGoal.toLocaleString()}`);
  row("Utilization Goal", "70%", "REVENUE MTD", "");
  row("Attrition Goal", "5%", "PROJECTED REVENUE", "");
  row("Total Sales", "50", "GAP TO GOAL - MONTH", "");
  row("DAYS 1-7", "DAYS 8-14", "DAYS 15-21", "DAYS 21+");
  row("$0.00", "$0.00", "$0.00", "$0.00");
  row("PREVIOUS MONTH");
  row("BUSINESS PERFORMANCE");
  row(
    "DAY", "GROSS REVENUE", "MEMBERSHIPS", "CREDITS", "PENALTY FEES", "MISC", "REV TOTAL", "PRETAX",
    "TRIALS", "CP TO TRIALS", "BOOKED", "SHOW", "NEW MEMBERSHIPS", "CLASS PACKS", "PT", "PSC", "PSC REV",
    "DEPOSIT", "TOTAL SALES", "REFINED REV", "UTILIZATION", "VISTS", "PSC VISITS", "PSC %", "CP VISITS",
    "CP %", "CP REV", "FROZEN", "TERMINATIONS", "REV LOST", "NO VISIT LAST 7", "BOOKED REV",
    "MRR", "MRR +1 MO", "MRR +2 MO", "MRR +3 MO"
  );
  row("DOWNTOWN", "DOWNTOWN");

  let revenueSum = 0;
  let trialsSum = 0;
  let cpSum = 0;
  let newMembershipsSum = 0;
  let terminationsSum = 0;
  let pscSum = 0;
  let pscRevSum = 0;
  let totalSalesSum = 0;

  for (let day = 1; day <= totalDays; day++) {
    const base = 1800 + ((day * 137 + monthIndex * 53) % 2600); // deterministic pseudo-variation, not random
    const gross = Math.round(base * seed);
    const pretax = Math.round(gross * 0.75);
    const trials = day % 4 === 0 ? 2 : day % 3 === 0 ? 1 : 0;
    const cp = day % 5 === 0 ? 1 : 0;
    const newMemberships = day % 6 === 0 ? 1 : 0;
    const termination = day % 9 === 0 ? 1 : 0;
    const psc = day % 8 === 0 ? 1 : 0;
    const pscRev = psc ? Math.round(150 * seed) : 0;
    const totalSalesDay = day % 2 === 0 ? 1 : 0;

    revenueSum += pretax;
    trialsSum += trials;
    cpSum += cp;
    newMembershipsSum += newMemberships;
    terminationsSum += termination;
    pscSum += psc;
    pscRevSum += pscRev;
    totalSalesSum += totalSalesDay;

    row(
      day, gross.toFixed(2), (gross * 0.6).toFixed(2), "0.00", "0.00", "0.00", (gross * 1.02).toFixed(2),
      pretax.toFixed(2), trials, cp, trials + 1, trials, newMemberships, 0,
      0, psc, pscRev.toFixed(2), "$0.00", totalSalesDay, (gross * 1.05).toFixed(2), (gross * 0.7).toFixed(2),
      `${65 + (day % 10)}%`, 45 + day, 0, "0%", 2, "10%", "$0.00", 0, termination, "$0.00", 0, "0.00",
      "", // unused spacer column (formerly the forecast base before the AG->AH shift)
      (55000 + day * 10 + monthIndex * 500).toFixed(2),
      (58000 + day * 10 + monthIndex * 500).toFixed(2),
      (61000 + day * 10 + monthIndex * 500).toFixed(2)
    );
  }

  const totalsRow = new Array(36).fill("");
  totalsRow[0] = "TOTALS";
  totalsRow[7] = revenueSum.toFixed(2);
  totalsRow[8] = trialsSum;
  totalsRow[9] = cpSum;
  totalsRow[12] = newMembershipsSum;
  totalsRow[15] = pscSum;
  totalsRow[16] = pscRevSum.toFixed(2);
  totalsRow[18] = totalSalesSum;
  totalsRow[20] = "68%";
  totalsRow[28] = terminationsSum;
  row(...totalsRow);

  // A completed synthetic month: "projected" and "MTD" are the same total,
  // and the gap is that total against the goal — filled in AFTER the totals
  // row is built so these three summary-block labels (only ever read from
  // the summary block, never the TOTALS row) have a real, self-consistent
  // value rather than showing "unavailable".
  rows[3][3] = `$${revenueSum.toLocaleString()}`; // REVENUE MTD
  rows[4][3] = `$${revenueSum.toLocaleString()}`; // PROJECTED REVENUE
  const gap = revenueSum - revenueGoal;
  rows[5][3] = gap < 0 ? `-$${Math.abs(gap).toLocaleString()}` : `$${gap.toLocaleString()}`;

  row("MIDTOWN", "MIDTOWN");
  row("MONTHLY TOTALS", "MONTHLY TOTALS");
  return rows;
}
