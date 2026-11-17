import { describe, expect, it } from "vitest";
import { allFacts, at, dollars, fact, first, formatValue, last, niceTicks, percentChange, SERIES, WHERE_YOU_STAND } from "@/lib/impact";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("impact data: every number is sourced", () => {
  it.each(Object.values(SERIES))("$id has a source, licence and retrieval date", (s) => {
    expect(s.source.url).toMatch(/^https:\/\//);
    expect(s.source.dataUrl).toMatch(/^https:\/\//);
    expect(s.source.licenseUrl).toMatch(/^https:\/\//);
    expect(s.source.license.length).toBeGreaterThan(3);
    expect(s.source.retrieved).toMatch(ISO_DATE);
    expect(s.source.citation?.length).toBeGreaterThan(20);
  });

  it.each(Object.values(SERIES))("$id has increasing years and finite, positive values", (s) => {
    expect(s.points.length).toBeGreaterThan(10);
    s.points.forEach((p, i) => {
      expect(Number.isFinite(p.value) && p.value > 0).toBe(true);
      if (i > 0) expect(p.year).toBeGreaterThan(s.points[i - 1].year);
    });
  });

  it("every fact has a source, licence note and an as-of date", () => {
    for (const f of allFacts()) {
      expect(f.source.url, f.id).toMatch(/^https:\/\//);
      expect(f.source.license.length, f.id).toBeGreaterThan(3);
      expect(f.asOf.length, f.id).toBeGreaterThan(3);
      if (f.low !== undefined && f.high !== undefined) expect(f.low, f.id).toBeLessThan(f.high);
    }
  });

  it("where-you-stand is a real (not projected) estimate with its source", () => {
    expect(WHERE_YOU_STAND.worldShareBelowUsMedianEstimateType).toBe("actual");
    expect(WHERE_YOU_STAND.source.url).toMatch(/^https:\/\//);
    expect(WHERE_YOU_STAND.worldShareBelowUsMedian).toBeGreaterThan(50);
    expect(WHERE_YOU_STAND.worldShareBelowUsMedian).toBeLessThan(100);
  });

  it("the poverty series stops before the World Bank's projections", () => {
    expect(last(SERIES.extremePoverty).year).toBeLessThanOrEqual(WHERE_YOU_STAND.year);
    expect(at(SERIES.extremePoverty, WHERE_YOU_STAND.year)?.value).toBe(WHERE_YOU_STAND.worldShareBelow3PerDay);
  });

  it("an unknown fact id fails loudly", () => {
    expect(() => fact("made-up")).toThrow();
  });
});

describe("helpers", () => {
  it("first / last", () => {
    expect(first(SERIES.childMortality).year).toBeLessThan(last(SERIES.childMortality).year);
  });

  it("percentChange", () => {
    expect(percentChange(100, 40)).toBe(-60);
    expect(percentChange(50, 75)).toBe(50);
  });

  it("dollars", () => {
    expect(dollars(3000)).toBe("$3,000");
    expect(dollars(1.5)).toBe("$1.5");
  });

  it.each([
    [100, [0, 25, 50, 75, 100]],
    [93.5, [0, 25, 50, 75, 100]],
    [45, [0, 20, 40, 60]],
    [872604, [0, 250000, 500000, 750000, 1000000]],
    [8000, [0, 2000, 4000, 6000, 8000]],
  ])("niceTicks(%d)", (max, ticks) => {
    expect(niceTicks(max)).toEqual(ticks);
  });
});

describe("formatValue", () => {
  it("formats each kind", () => {
    expect(formatValue(10.12, "percent")).toBe("10.1%");
    expect(formatValue(37.44, "rate")).toBe("37.4");
    expect(formatValue(609930, "count")).toBe("609,930");
  });
});
