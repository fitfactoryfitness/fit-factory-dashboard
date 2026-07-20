# Fit Factory Downtown — Performance Dashboard

A single-screen, TV-friendly operational dashboard for the Fit Factory Downtown team, built from the `DAILY REPORT 2026 - Fit Factory` Google Sheet. Optimized for 1920×1080 (also scales down to 1366×768), designed to be displayed continuously via AbleSign.

## Purpose

Answers, at a glance: are we winning this month, are we on pace, what's the biggest priority right now, is today going well, and what should the team do next. See `MAPPING_REPORT.md` for the underlying spreadsheet-to-metric mapping and discovery notes.

## Tech stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Recharts + Zod-ready validation layer + Google Sheets API v4 (`googleapis`) + Vitest.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. By default `DASHBOARD_DATA_SOURCE=mock`, so it runs immediately with no Google credentials, using representative July-shaped sample data (a **MOCK DATA** badge shows in the header whenever this mode is active).

Append `?debug=1` to the URL for a diagnostics panel showing the data source, resolved tab, resolved cell/label mappings, and any warnings.

## Switching to live Google Sheets data

1. In Google Cloud Console, create or select a project.
2. Enable the **Google Sheets API** for that project.
3. Create a **Service Account** (IAM & Admin → Service Accounts).
4. Create a **JSON key** for that service account and download it.
5. Open the target spreadsheet and **Share** it with the service account's email address (found in the JSON key, `client_email`) as **Viewer**.
6. In `.env.local`, set:
   ```
   DASHBOARD_DATA_SOURCE=google
   GOOGLE_SHEETS_SPREADSHEET_ID=1jVpchfZkON-vCO1W-pIAMqHYhlWn-6FwL4yfUO2iCCM
   GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email from the JSON key>
   GOOGLE_PRIVATE_KEY="<private_key from the JSON key>"
   ```
   The private key in the JSON file contains real newlines; when pasting into a `.env` file, replace each newline with the literal two-character sequence `\n` (the app converts `\n` back to real newlines at runtime in `src/lib/googleSheets/client.ts`).
7. Restart `npm run dev`.

Credentials are only ever read server-side (`src/lib/googleSheets/client.ts`, used from the API route and the server-rendered page) — never bundled to the browser.

## How metric discovery works

The parser never assumes a fixed cell address. For the top summary block (`src/lib/spreadsheetParser/summaryParser.ts`), it scans the first ~12 rows for a normalized label match (e.g. "REVENUE GOAL"), then looks a few cells to the right for the first parseable value. For the daily table (`src/lib/spreadsheetParser/dailyTableParser.ts`), it locates the header row by label, builds a column map from whatever order the headers actually appear in, and parses rows using that map — so column reordering or additions between months don't break it. If a label can't be found, it falls back to an approximate coordinate in `src/config/fallbackCells.ts` and logs a diagnostics warning; it never silently displays a guessed value as if it were confirmed. See `MAPPING_REPORT.md` for the specific label/alias findings from discovery.

## How target configuration works

`src/config/targets.ts` defines a `MetricTarget` with a `source` of `"spreadsheet" | "fallback" | "manual"`. Trials (50/month) and CP-to-Trials (30/month) currently use `"fallback"` because no target cell exists anywhere in the workbook (confirmed during discovery) — the UI shows a small note on those KPI cards when the target came from a fallback rather than the spreadsheet.

## How status colors are calculated

Overall monthly status (`src/lib/calculations/status.ts`):
- **TARGET ACHIEVED** — revenue MTD ≥ goal.
- **ON TRACK** — projected revenue ≥ 100% of goal (downgraded to AT RISK if Trials *and* CP-to-Trials are both severely behind pace — see `LEADING_INDICATOR_DOWNGRADE` in `src/config/thresholds.ts`).
- **AT RISK** — projected revenue is 90–99.99% of goal.
- **OFF TRACK** — projected revenue is below 90% of goal.

KPI card status is **pace-adjusted**, not raw percent-to-target: it compares current progress to the *expected* progress for today's point in the month (`expectedByToday = target × calendarProgress`), so being at 62% of a goal that's only 40% "due" is ahead of pace, not behind. Thresholds live in `src/config/thresholds.ts`.

## Strict read-only policy for monthly figures

Every MTD figure (Revenue MTD, Trials, CP-to-Trials, New Memberships, Total Sales, Utilization, Terminations, PSC, PSC Revenue) is read directly from a cell the spreadsheet itself already computed: the daily table's own "TOTALS" row first (e.g. Revenue MTD from the TOTALS row's PRETAX cell, matching `H47` in the live sheet), falling back to the summary block's own label only if the TOTALS row doesn't have that field. **Nothing is summed or derived client-side** — if neither source has a value, the metric is reported as unavailable rather than estimated. Projected Revenue (`I5:J5` merged) and Gap to Goal (`I6:J6` merged) are likewise passed straight through from their labels, never recalculated.

PSC's two figures (count and revenue) are confirmed at `P47`/`Q47` on the live sheet — label matching is tried first (same TOTALS-row mechanism as everything else), with a direct absolute-column read on that same row as a safety net if the label isn't found (`src/config/fallbackCells.ts`, `PSC_TOTALS_FALLBACK`).

The forward MRR forecast (next 1/2/3 months) has no reliable spreadsheet label to match on, so it's read by the exact confirmed absolute columns `AG`/`AH`/`AI` instead (`MRR_FORECAST_COLUMNS`). Each is a running snapshot, not a monthly total — the value shown is the **last non-blank entry** posted in that column across the daily rows, the same pattern already used for "No Visit Last 7," never a sum or a recalculation.

Per-day revenue everywhere in the UI (trend chart, etc.) is the **PRETAX (FF)** column specifically — confirmed against the live sheet (day 5 = cell `H19` = 1,588.01, which is PRETAX, not REV TOTAL). REV TOTAL is a separate column and is never substituted in.

## Removed cards

The "Total Sales" KPI card and the "Today So Far" panel were removed per product feedback — they added clutter without adding a decision the team could act on. "Today's Focus" and the top-right overall-status badge were removed in a later pass, along with the Utilization and Terminations KPI cards (the underlying figures are still read from the spreadsheet, just no longer surfaced as their own cards). The screen now emphasizes Trials, CP-to-Trials, New Memberships, PSC (count + revenue), a full-width trend chart, and an MRR forecast strip for the next three months.

## Required-per-day math

"Need X/day" figures are **ceiled**, not rounded to the nearest whole number — rounding down a fractional requirement (e.g. 1.42/day rounding to "1") can quietly imply a pace that undershoots the target by month end. "Remaining days" for this framing excludes today (today's numbers are already mostly locked in), so on July 20 in a 31-day month it shows 11 remaining days, not 12.

## Kiosk / unattended display

There's no manual refresh button — this is a TV display with no input device. The dashboard polls `/api/dashboard` every 15 seconds (`AUTO_REFRESH_INTERVAL_MS` in `src/config/thresholds.ts`), which is close enough to instant for a screen nobody is manually refreshing, and the "Live / Stale / Critical" indicator in the header communicates freshness without requiring any interaction.

Note: Google Sheets has no push notification for cell edits reachable from a read-only service account, so "instant" here means fast polling, not a live push. True push would require adding an Apps Script `onEdit` trigger that calls a public webhook, held open via SSE/WebSocket — meaningfully more infrastructure (and another thing that can silently break) for a gain most viewers won't perceive over a 15s poll.

## How priorities are selected

`src/lib/priorityEngine/index.ts` is a deterministic rules engine (no external AI call) that evaluates revenue shortfall, trials pace gap, CP-to-Trials pace gap, utilization gap, terminations, and inactive-member counts — each rule only fires when the underlying spreadsheet-derived number actually supports it. Each rule produces a score; the top 3 by score are shown in "Today's Focus." Fully unit-tested in `tests/priorityEngine.test.ts`.

## How refresh works

The dashboard fetches `/api/dashboard` every 15 seconds (`AUTO_REFRESH_INTERVAL_MS` in `src/config/thresholds.ts`); there is no manual refresh button (kiosk display, no input device). If a refresh fails, the last successful payload stays on screen with a visible warning banner rather than going blank (`src/data/provider.ts`, `fetchDashboardWithFallback`). Freshness is shown as Live (<10 min), Stale (10–30 min), or Critical (>30 min) — these thresholds are about detecting a stuck/broken refresh loop, not the poll interval itself.

## Changing the spreadsheet ID

Set `GOOGLE_SHEETS_SPREADSHEET_ID` in the environment — no code changes needed, as long as the new workbook uses the same three-letter month tab naming convention (`JAN`…`DEC`).

## How month rollover works

`src/lib/googleSheets/tabResolver.ts` computes the current month tab from `America/Toronto` time (`BUSINESS_TIMEZONE` in `.env`), so the app automatically switches from `JUL` to `AUG` at the start of August with no deployment. If the expected tab doesn't exist yet (e.g. the new month's tab hasn't been created), it falls back to the latest available prior month tab and shows a visible warning (e.g. "AUG tab not found. Showing JUL data.") rather than silently guessing.

## Known limitations

- Trials/CP-to-Trials targets are business rules, not spreadsheet-driven (no such cell exists in the source workbook today).
- Midtown is intentionally treated as a secondary, best-effort comparison strip only — its summary layout is not a mirror of Downtown's (different labels, missing fields), so it isn't held to the same reliability bar as Downtown KPIs.
- Exact spreadsheet cell coordinates for fallback resolution are approximations captured from the July 2026 sheet; they're a last resort behind label-based lookup and are logged when used.
- No authentication yet — see `DEPLOYMENT.md` before putting this on a real screen/URL.

## Testing

```bash
npm run typecheck
npm test
```

39 unit tests cover: month-tab resolution and rollover fallback, label normalization and alias resolution (including the "VISTS" typo and reordered columns), currency/percent/number parsing (including blanks, formula errors, and accounting negatives), pace/status calculation edge cases (zero goal, zero remaining days, exceeded targets), and priority ranking.

Note: in this build/preview sandbox, `npm run lint` currently fails due to a nested dependency version conflict (`es-abstract`) introduced by an interrupted install in the sandbox's filesystem — `npm run typecheck` and `npm test` are unaffected and both pass. A fresh `npm install` on a normal machine should resolve the lint dependency tree cleanly.
