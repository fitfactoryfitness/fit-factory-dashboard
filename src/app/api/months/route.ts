import { NextResponse } from "next/server";
import { listAvailableMonths } from "@/data/provider";

export const dynamic = "force-dynamic";

// Backs the month selector / compare panel's month picker — returns exactly
// which month tabs exist in the workbook right now (never a hardcoded
// JAN-JUL list), plus which one is "live" (the auto-resolved current month).
export async function GET() {
  try {
    const result = await listAvailableMonths(new Date());
    return NextResponse.json(result, { headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ months: [], current: "", error: message }, { status: 500 });
  }
}
