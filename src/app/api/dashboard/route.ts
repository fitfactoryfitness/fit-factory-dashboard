import { NextResponse } from "next/server";
import { fetchDashboardWithFallback, fetchDashboardForMonth } from "@/data/provider";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // ?month=XXX loads one explicit historical month tab directly (month
  // selector / compare panel) instead of the auto-resolved live month.
  // There's no stale-payload fallback for this path — see fetchDashboardForMonth.
  const month = searchParams.get("month");
  try {
    if (month) {
      const payload = await fetchDashboardForMonth(month, new Date());
      return NextResponse.json(
        { payload, error: null },
        { headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" } }
      );
    }
    const { payload, error } = await fetchDashboardWithFallback(new Date());
    return NextResponse.json(
      { payload, error },
      { headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ payload: null, error: message }, { status: 500 });
  }
}
