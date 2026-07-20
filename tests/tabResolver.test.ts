import { describe, it, expect } from "vitest";
import { currentMonthTabName, resolveTab } from "@/lib/googleSheets/tabResolver";

describe("tabResolver", () => {
  it("resolves month tab from timezone-aware date", () => {
    const d = new Date(Date.UTC(2026, 6, 20, 12)); // July 20 UTC noon
    const { tab, year } = currentMonthTabName(d, "America/Toronto");
    expect(tab).toBe("JUL");
    expect(year).toBe(2026);
  });

  it("resolves January correctly", () => {
    const d = new Date(Date.UTC(2026, 0, 5, 12));
    const { tab } = currentMonthTabName(d, "America/Toronto");
    expect(tab).toBe("JAN");
  });

  it("uses requested tab when present", () => {
    const res = resolveTab("JUL", ["JAN", "JUN", "JUL", "TEMPLATE", "ANNUAL"]);
    expect(res.usedFallback).toBe(false);
    expect(res.resolvedTab).toBe("JUL");
  });

  it("falls back to latest prior month tab when requested tab is missing (month rollover)", () => {
    const res = resolveTab("AUG", ["JAN", "JUN", "JUL", "TEMPLATE"]);
    expect(res.usedFallback).toBe(true);
    expect(res.resolvedTab).toBe("JUL");
    expect(res.warning).toContain("AUG tab not found");
  });

  it("never silently returns the requested (wrong) tab name as resolved when missing", () => {
    const res = resolveTab("AUG", ["JAN", "TEMPLATE"]);
    expect(res.resolvedTab).not.toBe("AUG");
  });
});
