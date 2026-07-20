import { NextResponse } from "next/server";
import { fetchDashboardWithFallback } from "@/data/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
