import { describe, it, expect } from "vitest";
import { normalizeLabel, findAliasKey } from "@/config/aliases";

describe("label normalization + alias resolution", () => {
  it("normalizes case, punctuation, and parenthetical qualifiers", () => {
    expect(normalizeLabel("REVENUE MTD")).toBe("revenue mtd");
    expect(normalizeLabel("CP TO TRIALS")).toBe("cp to trials");
    expect(normalizeLabel("PRETAX (FF)")).toBe("pretax");
  });

  it("resolves the VISTS typo to the visits alias key", () => {
    expect(findAliasKey("VISTS")).toBe("visits");
    expect(findAliasKey("VISITS")).toBe("visits");
    expect(findAliasKey("CHECK INS")).toBe("visits");
  });

  it("resolves CP TO TRIALS variants", () => {
    expect(findAliasKey("CP TO TRIALS")).toBe("cpToTrials");
    expect(findAliasKey("ClassPass to Trials")).toBe("cpToTrials");
  });

  it("resolves revenue goal / revenue target as the same concept", () => {
    expect(findAliasKey("REVENUE GOAL")).toBe("revenueGoal");
    expect(findAliasKey("REVENUE TARGET")).toBe("revenueGoal");
  });

  it("returns null for unrecognized labels", () => {
    expect(findAliasKey("SOME RANDOM LABEL")).toBeNull();
  });
});
