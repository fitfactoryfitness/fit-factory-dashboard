# Spreadsheet Data-Mapping Report

Source: **DAILY REPORT 2026 - Fit Factory** (Google Sheet `1jVpchfZkON-vCO1W-pIAMqHYhlWn-6FwL4yfUO2iCCM`), tabs discovered: `ANNUAL`, `TEMPLATE`, `JAN`–`DEC`, `TRIALS`. Discovery was done by pulling a natural-language dump of the workbook and cross-referencing `TEMPLATE`, `JUN`, and `JUL`.

## Key structural findings

1. **Column order is not stable across months.** At least 7 distinct header-row variants exist across `TEMPLATE` and real month tabs — columns get added (`DEPOSIT`, `CP TO TRIALS`, `CP REV`), renamed (`APPOINTMENTS`→`BOOKED`, `CHECK INS`/`VISITS`/`VISTS`), and reordered (`REFINED (PT)` moves relative to `TOTAL SALES`/`UTILIZATION`). **Label-based lookup is mandatory** — the app never assumes a fixed column index without first trying a label match.
2. **`VISTS` is a real, exact spelling typo** in at least one header variant (missing the "I" in VISITS). Handled via the alias dictionary (`config/aliases.ts`).
3. **Downtown and Midtown summary blocks are not mirrored.** Downtown uses "REVENUE GOAL"; Midtown's equivalent cell is labeled "REVENUE TARGET". Downtown has a "PROJECTED REVENUE" line; Midtown has no equivalent field at all. The parser treats Midtown as a secondary, best-effort comparison only — never merged into Downtown KPIs.
4. **No spreadsheet cell defines Trials or CP-to-Trials targets.** Searched exhaustively for "TRIALS GOAL" / "CP TO TRIALS GOAL" style labels — none exist. The 50 / 30 monthly targets are configured as `source: "fallback"` business rules in `config/targets.ts`, clearly flagged as such in the UI and diagnostics panel.
5. **`#DIV/0!` formula errors occur regularly**, mainly on percent columns (e.g. utilization) on low-activity days where the denominator (visits) is zero. The value parser (`lib/spreadsheetParser/valueParsing.ts`) catches all known formula-error strings and returns `null` with a logged warning — it never crashes or silently displays a wrong number.
6. **Blank cells are distinct from zero.** Confirmed real blank cells exist mid-row in daily data (e.g. a day with no PT sessions shows an empty cell, not "0"). The parser preserves this distinction throughout — a blank cell yields `null`, an explicit `"$0.00"` yields `0`.
7. **"Projected Revenue"** exists as an exact-match label on the Downtown side only, immediately following the Attrition Goal row in the summary block. Confirmed live value for July: revenue goal `$85,000`, revenue MTD `$52,785.61`, projected `$77,090.61`, gap `-$7,909.39` — matching the example figures in the brief.

## Metric mapping (Downtown)

| Metric | Label(s) searched | Resolution | Type | Notes |
|---|---|---|---|---|
| Revenue Goal | "REVENUE GOAL" | label search, top-12 rows, Downtown column range; fallback ~I3 | currency | |
| Revenue MTD | "REVENUE MTD" | label search; fallback ~I4 | currency | |
| Projected Revenue | "PROJECTED REVENUE" | label search; fallback ~I5 | currency | Midtown has no equivalent |
| Gap to Goal (Month) | "GAP TO GOAL - MONTH" | label search; fallback ~I6 | currency | |
| Booked Revenue | "BOOKED REVENUE" | label search | currency | |
| Membership Start | "Membership Start" | label search | count | |
| Utilization Goal | "Utilization Goal" | label search | percent | |
| Attrition Goal | "Attrition Goal" | label search | percent | |
| Trials (daily rollup) | "TRIALS" header column | header map + row sum | count | |
| CP to Trials (daily rollup) | "CP TO TRIALS" (alias: ClassPass to Trials) | header map + row sum; fallback col J | count | Column not always present — flagged in diagnostics if missing |
| Total Sales | "TOTAL SALES" | header map + row sum, or summary "Total Sales" | count | |
| New Memberships | "NEW MEMBERSHIPS" | header map + row sum | count | |
| Utilization (MTD avg) | "UTILIZATION" | header map + row average | percent | |
| Terminations | "TERMINATIONS" | header map + row sum | count | |
| Revenue Lost | "REV LOST" | header map + row sum | currency | |
| No Visit Last 7 | "NO VISIT LAST 7" | header map, latest value | count | Not summed — it's a running snapshot |

## Open items (non-blocking)

- Exact A1 cell addresses for the summary block couldn't be derived from the text-dump discovery method; the fallback coordinates in `config/fallbackCells.ts` are best-effort approximations from the July sheet and are last-resort only (label search is always tried first, and a diagnostics warning is logged whenever a fallback is used).
- Whether the `CP TO TRIALS`-inclusive header variant belongs precisely to `JUL` (vs. a neighboring tab) couldn't be 100% confirmed from the dump alone. This does not block implementation because the parser resolves headers live, by label, against whatever tab is actually loaded at runtime — it doesn't depend on which month the discovery sample came from.

No blocking questions were identified. All decisions above were made using the safest, most reversible interpretation (label-first, fallback-second, never silently guessing).
