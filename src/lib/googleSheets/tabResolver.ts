// Resolves which spreadsheet tab represents "the current month," dynamically,
// using the business timezone. Never hardcode a month tab name in app code —
// always go through this resolver.

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function currentMonthTabName(now: Date, timeZone: string): { tab: string; year: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const monthNum = Number(parts.find((p) => p.type === "month")?.value); // 1-12
  const tab = MONTH_ABBR[monthNum - 1];
  return { tab, year };
}

export type TabResolution = {
  requestedTab: string;
  resolvedTab: string;
  usedFallback: boolean;
  warning?: string;
};

// Given the list of tabs that actually exist in the workbook, resolve the
// tab to use. Falls back to the latest available month tab (never silently
// picks the wrong month without a warning).
export function resolveTab(requestedTab: string, availableTabs: string[]): TabResolution {
  if (availableTabs.includes(requestedTab)) {
    return { requestedTab, resolvedTab: requestedTab, usedFallback: false };
  }

  const monthTabsPresent = MONTH_ABBR.filter((m) => availableTabs.includes(m));
  const requestedIdx = MONTH_ABBR.indexOf(requestedTab);
  // Prefer the closest prior month tab that exists.
  const priorCandidates = monthTabsPresent
    .map((m) => MONTH_ABBR.indexOf(m))
    .filter((idx) => idx <= requestedIdx)
    .sort((a, b) => b - a);

  const fallbackIdx = priorCandidates[0] ?? monthTabsPresent.map((m) => MONTH_ABBR.indexOf(m)).sort((a, b) => b - a)[0];

  if (fallbackIdx === undefined) {
    return {
      requestedTab,
      resolvedTab: requestedTab,
      usedFallback: true,
      warning: `No month tabs found in workbook. Expected "${requestedTab}".`,
    };
  }

  const resolvedTab = MONTH_ABBR[fallbackIdx];
  return {
    requestedTab,
    resolvedTab,
    usedFallback: true,
    warning: `${requestedTab} tab not found. Showing ${resolvedTab} data.`,
  };
}
