import { DashboardPayload } from "@/types/dashboard";
import { buildMonthlySummaryAndDaily } from "@/lib/spreadsheetParser/normalize";
import { currentMonthTabName, resolveTab, listMonthTabsInOrder, MONTH_ABBR } from "@/lib/googleSheets/tabResolver";
import { BUSINESS_TIMEZONE } from "@/config/thresholds";
import { buildMockJulGrid, buildMockGridForMonth } from "@/data/mockGrid";

export interface DashboardProvider {
  fetchDashboard(now: Date): Promise<DashboardPayload>;
  // Loads one specific month tab directly (no "current month" resolution/
  // fallback) — used by the month selector and the compare/YTD features so
  // a user can look at a past month without waiting on auto-refresh logic
  // meant for the live kiosk view.
  fetchDashboardForMonth(tabName: string, now: Date): Promise<DashboardPayload>;
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1jVpchfZkON-vCO1W-pIAMqHYhlWn-6FwL4yfUO2iCCM";

export class MockDashboardProvider implements DashboardProvider {
  async fetchDashboard(now: Date): Promise<DashboardPayload> {
    const { tab } = currentMonthTabName(now, BUSINESS_TIMEZONE);
    // Mock always simulates the JUL tab being available (it's the tab this
    // sample grid was built from), regardless of which month it actually is,
    // so local testing works year-round. A visible MOCK DATA badge in the UI
    // makes this obvious.
    const grid = buildMockJulGrid();
    const { summary, daily, diagnostics, warnings } = buildMonthlySummaryAndDaily({
      grid,
      tabName: tab,
      usedFallbackTab: false,
      now,
    });
    const today = daily.find((d) => d.isToday) ?? null;

    return {
      generatedAt: now.toISOString(),
      dataSource: "mock",
      timezone: BUSINESS_TIMEZONE,
      spreadsheetId: SPREADSHEET_ID,
      summary,
      daily,
      today,
      diagnostics,
      warnings,
    };
  }

  async fetchDashboardForMonth(tabName: string, now: Date): Promise<DashboardPayload> {
    const { year } = currentMonthTabName(now, BUSINESS_TIMEZONE);
    // JUL keeps using the hand-authored, test-asserted mock grid; every
    // other month gets the synthetic generator (see mockGrid.ts) — mock mode
    // treats all 12 months as "available" so the selector/compare UI can be
    // exercised locally without live credentials.
    const grid = tabName === "JUL" ? buildMockJulGrid() : buildMockGridForMonth(tabName, year);
    const { summary, daily, diagnostics, warnings } = buildMonthlySummaryAndDaily({
      grid,
      tabName,
      usedFallbackTab: false,
      now,
    });
    const today = daily.find((d) => d.isToday) ?? null;

    return {
      generatedAt: now.toISOString(),
      dataSource: "mock",
      timezone: BUSINESS_TIMEZONE,
      spreadsheetId: SPREADSHEET_ID,
      summary,
      daily,
      today,
      diagnostics,
      warnings,
    };
  }
}

export class GoogleSheetsProvider implements DashboardProvider {
  async fetchDashboard(now: Date): Promise<DashboardPayload> {
    const { listTabNames, readSheetGrid } = await import("@/lib/googleSheets/client");
    const { tab: requestedTab } = currentMonthTabName(now, BUSINESS_TIMEZONE);
    const availableTabs = await listTabNames(SPREADSHEET_ID);
    const resolution = resolveTab(requestedTab, availableTabs);

    const grid = await readSheetGrid(SPREADSHEET_ID, resolution.resolvedTab);
    const { summary, daily, diagnostics, warnings } = buildMonthlySummaryAndDaily({
      grid,
      tabName: resolution.resolvedTab,
      usedFallbackTab: resolution.usedFallback,
      fallbackWarning: resolution.warning,
      now,
    });
    const today = daily.find((d) => d.isToday) ?? null;

    return {
      generatedAt: now.toISOString(),
      dataSource: "google",
      timezone: BUSINESS_TIMEZONE,
      spreadsheetId: SPREADSHEET_ID,
      summary,
      daily,
      today,
      diagnostics,
      warnings,
    };
  }

  async fetchDashboardForMonth(tabName: string, now: Date): Promise<DashboardPayload> {
    const { listTabNames, readSheetGrid } = await import("@/lib/googleSheets/client");
    const availableTabs = await listTabNames(SPREADSHEET_ID);
    if (!availableTabs.includes(tabName)) {
      throw new Error(`"${tabName}" tab not found in the workbook.`);
    }
    const grid = await readSheetGrid(SPREADSHEET_ID, tabName);
    const { summary, daily, diagnostics, warnings } = buildMonthlySummaryAndDaily({
      grid,
      tabName,
      usedFallbackTab: false,
      now,
    });
    const today = daily.find((d) => d.isToday) ?? null;

    return {
      generatedAt: now.toISOString(),
      dataSource: "google",
      timezone: BUSINESS_TIMEZONE,
      spreadsheetId: SPREADSHEET_ID,
      summary,
      daily,
      today,
      diagnostics,
      warnings,
    };
  }
}

let cachedPayload: DashboardPayload | null = null;

export function getProvider(): DashboardProvider {
  const source = (process.env.DASHBOARD_DATA_SOURCE || "mock").toLowerCase();
  return source === "google" ? new GoogleSheetsProvider() : new MockDashboardProvider();
}

// Fetches fresh data, falling back to the last successful payload on error
// so the dashboard never goes blank because of a single failed refresh.
export async function fetchDashboardWithFallback(now: Date = new Date()): Promise<{ payload: DashboardPayload; error: string | null }> {
  const provider = getProvider();
  try {
    const payload = await provider.fetchDashboard(now);
    cachedPayload = payload;
    return { payload, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error fetching dashboard data.";
    if (cachedPayload) {
      return { payload: cachedPayload, error: message };
    }
    throw err;
  }
}

// Loads one explicit month tab (month selector / compare / YTD). Unlike
// fetchDashboardWithFallback, there's no "last known payload" fallback here —
// a historical month either loads or it doesn't, there's nothing stale to
// fall back to.
export async function fetchDashboardForMonth(tabName: string, now: Date = new Date()): Promise<DashboardPayload> {
  const provider = getProvider();
  return provider.fetchDashboardForMonth(tabName, now);
}

// Which month tabs the selector/compare picker should offer, plus which one
// is "live" (the auto-resolved current month). Mock mode offers all 12 so
// the UI is fully exercisable without live credentials; Google mode reflects
// exactly what tabs exist in the workbook right now.
export async function listAvailableMonths(now: Date = new Date()): Promise<{ months: string[]; current: string }> {
  const { tab: current } = currentMonthTabName(now, BUSINESS_TIMEZONE);
  const source = (process.env.DASHBOARD_DATA_SOURCE || "mock").toLowerCase();
  if (source !== "google") {
    return { months: MONTH_ABBR, current };
  }
  const { listTabNames } = await import("@/lib/googleSheets/client");
  const availableTabs = await listTabNames(SPREADSHEET_ID);
  return { months: listMonthTabsInOrder(availableTabs), current };
}
