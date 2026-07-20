import { describe, it, expect } from "vitest";
import { parseCurrency, parsePercent, parseNumber, isBlank } from "@/lib/spreadsheetParser/valueParsing";

describe("value parsing safety", () => {
  it("parses currency values including negatives and thousands separators", () => {
    expect(parseCurrency("$52,785.61").value).toBeCloseTo(52785.61);
    expect(parseCurrency("-$7,909.39").value).toBeCloseTo(-7909.39);
    expect(parseCurrency("($1,200.00)").value).toBeCloseTo(-1200);
  });

  it("treats blank and N/A as null, not zero", () => {
    expect(parseCurrency("").value).toBeNull();
    expect(parseCurrency(undefined).value).toBeNull();
    expect(parseCurrency("N/A").value).toBeNull();
    expect(isBlank("")).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank("0")).toBe(false);
  });

  it("parses explicit zero as zero, distinct from blank", () => {
    expect(parseCurrency("$0.00").value).toBe(0);
    expect(parseNumber("0").value).toBe(0);
  });

  it("returns null with a warning on formula errors instead of throwing", () => {
    const result = parseCurrency("#DIV/0!");
    expect(result.value).toBeNull();
    expect(result.warning).toContain("Formula error");
    expect(() => parsePercent("#VALUE!")).not.toThrow();
  });

  it("parses percent values including fractions and the <5 convention", () => {
    expect(parsePercent("70%").value).toBe(70);
    expect(parsePercent("0.7").value).toBe(70);
    expect(parsePercent("<5").value).toBe(5);
  });

  it("parses plain counts safely", () => {
    expect(parseNumber("31").value).toBe(31);
    expect(parseNumber("1,234").value).toBe(1234);
    expect(parseNumber("abc").value).toBeNull();
  });
});
