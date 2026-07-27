import { NextResponse } from "next/server";
import { fetchDashboardForMonth, listAvailableMonths } from "@/data/provider";
import { sumYtd } from "@/lib/calculations/ytd";
import { MONTH_ABBR } from "@/lib/googleSheets/tabResolver";
import { MonthlySummary } from "@/types/dashboard";

export const dynamic = "force-dynamic";

// Year-to-Date: sums every available month tab from JAN through ?through=
// (defaults to the live current month). See src/lib/calculations/ytd.ts for
// why this is the one place in the app that sums figures client-side —
// everything else reads a single already-computed spreadsheet cell.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  try {
    const { months: availableMonths, current } = await listAvailableMonths(now);
    const through = searchParams.get("through") || current;
    const throughIdx = MONTH_ABBR.indexOf(through);
    if (throughIdx === -1) {
      return NextResponse.json({ ytd: null, error: `"${through}" is not a valid month.` }, { status: 400 });
    }
    const monthsToInclude = availableMonths.filter((m) => MONTH_ABBR.indexOf(m) <= throughIdx);

    const loadWarnings: string[] = [];
    const results: { tabName: string; summary: MonthlySummary }[] = [];
    // Sequential, not Promise.all — this hits the same Google Sheets API
    // quota as every other request; a handful of sequential reads is safer
    // than bursting up to 12 concurrent calls for a feature nobody needs
    // sub-second.
    for (const tabName of monthsToInclude) {
      try {
        const payload = await fetchDashboardForMonth(tabName, now);
        results.push({ tabName, summary: payload.summary });
      } catch (err) {
        loadWarnings.push(`Skipped ${tabName}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }

    const ytd = sumYtd(results);
    ytd.warnings = [...ytd.warnings, ...loadWarnings];

    return NextResponse.json(
      { ytd, error: null },
      { headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ytd: null, error: message }, { status: 500 });
  }
}
