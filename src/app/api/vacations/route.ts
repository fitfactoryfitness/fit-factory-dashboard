import { NextResponse } from "next/server";
import { fetchVacations } from "@/lib/vacations";

export const dynamic = "force-dynamic";

// Proxies the vacation tracker's own public /api/time-off endpoint,
// resolves names/teams via the roster, and buckets into "away now" /
// "starting within 7 days" server-side so the client just renders. Fetched
// server-side (not directly from the browser) so the tracker's URL isn't
// hardcoded into client JS and so this follows the same pattern as every
// other data source in this app.
export async function GET() {
  const vacations = await fetchVacations(new Date());
  return NextResponse.json(vacations, { headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" } });
}
