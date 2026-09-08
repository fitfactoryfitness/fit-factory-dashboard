import { describe, it, expect } from "vitest";
import { MockDashboardProvider } from "@/data/provider";

describe("MockDashboardProvider — end-to-end sanity check (strict read-only policy)", () => {
  it("reads monthly figures straight from the spreadsheet's own TOTALS row, never computing a sum", async () => {
    const provider = new MockDashboardProvider();
    const payload = await provider.fetchDashboard(new Date(Date.UTC(2026, 6, 20, 16)));

    // These all come from the mock's TOTALS row directly (see mockGrid.ts) —
    // not from summing the daily rows, which use different, unrelated
    // formulaic demo numbers that intentionally do NOT add up to these.
    expect(payload.summary.trialsMTD).toBe(33);
    expect(payload.summary.cpToTrialsMTD).toBe(7);
    expect(payload.summary.newMembershipsMTD).toBe(15);
    expect(payload.summary.totalSalesMTD).toBe(53);
    expect(payload.summary.terminationsMTD).toBe(1);
    expect(payload.summary.utilizationMTD).toBe(67);

    // Revenue MTD is read from the TOTALS row's PRETAX cell, matching the
    // real sheet's H47 — not summed from daily pretaxRevenue values.
    expect(payload.summary.revenueMTD).toBeCloseTo(52785.61, 2);

    // Gap and Projected Revenue are passed through from the summary block's
    // own labels, untouched — never recomputed from other inputs.
    expect(payload.summary.revenueGap).toBeCloseTo(-7909.39, 2);
    expect(payload.summary.projectedRevenue).toBeCloseTo(77090.61, 2);
  });

  it("reports a metric as unavailable, not estimated, when neither a TOTALS row nor a summary label has it", async () => {
    const provider = new MockDashboardProvider();
    const payload = await provider.fetchDashboard(new Date(Date.UTC(2026, 6, 20, 16)));
    // revenueLostMTD has no TOTALS-row entry in the mock and no summary
    // label — it must come back null, not a guessed/summed value.
    expect(payload.summary.revenueLostMTD).toBeNull();
  });

  it("reads PSC totals (P47/Q47) and the forward MRR forecast (AH/AI/AJ), both confirmed-cell direct reads", async () => {
    const provider = new MockDashboardProvider();
    const payload = await provider.fetchDashboard(new Date(Date.UTC(2026, 6, 20, 16)));
    expect(payload.summary.pscMTD).toBe(4);
    expect(payload.summary.pscRevMTD).toBeCloseTo(620, 2);

    // Latest posted value in each forecast column — not summed, not
    // recalculated, just the last non-blank entry read directly.
    expect(payload.summary.mrrForecast.plus1).toBeCloseTo(55200, 2);
    expect(payload.summary.mrrForecast.plus2).toBeCloseTo(58200, 2);
    expect(payload.summary.mrrForecast.plus3).toBeCloseTo(61500, 2);
  });
});
