import { fetchDashboardWithFallback } from "@/data/provider";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { debug?: string } }) {
  const initial = await fetchDashboardWithFallback(new Date());
  const debug = searchParams?.debug === "1";
  return <DashboardClient initial={initial} debug={debug} />;
}
