// Data for the "Why give" page (/why-give). Every number shown there comes
// from src/data/impact/*.json, each with its source, licence and the date we
// retrieved it. Refresh yearly (docs/ROADMAP.md → "Refresh the Why give numbers").
// Tests: src/lib/impact.test.ts.
import childMortality from "@/data/impact/child-mortality.json";
import extremePoverty from "@/data/impact/extreme-poverty.json";
import malariaDeaths from "@/data/impact/malaria-deaths.json";
import whereYouStand from "@/data/impact/where-you-stand.json";
import factsFile from "@/data/impact/facts.json";

export type Source = {
  name: string;
  url: string;
  dataUrl?: string;
  version?: string;
  retrieved?: string;
  license: string;
  licenseUrl: string;
  citation?: string;
};

export type Point = { year: number; value: number };

export type Series = {
  id: string;
  title: string;
  unit: string;
  definition: string;
  source: Source;
  notes: string;
  points: Point[];
};

export type Fact = {
  id: string;
  claim: string;
  quote?: string;
  low?: number;
  high?: number;
  asOf: string;
  source: Source;
};

export const SERIES = {
  childMortality: childMortality as Series,
  extremePoverty: extremePoverty as Series,
  malariaDeaths: malariaDeaths as Series,
} as const;

export const WHERE_YOU_STAND = whereYouStand as {
  year: number;
  usMedianPerDay: number;
  usWelfareType: string;
  worldShareBelowUsMedian: number;
  worldShareBelowUsMedianEstimateType: string;
  worldShareBelow3PerDay: number;
  source: Source;
  notes: string;
};

export const FACTS_RETRIEVED = factsFile.retrieved;
const FACTS = factsFile.facts as Fact[];

/** A cited fact by id; throws at build time if it's missing, so the page can't show an unsourced number. */
export function fact(id: string): Fact {
  const found = FACTS.find((f) => f.id === id);
  if (!found) throw new Error(`Unknown impact fact: ${id}`);
  return found;
}

export function allFacts(): readonly Fact[] {
  return FACTS;
}

export function first(series: Series): Point {
  return series.points[0];
}

export function last(series: Series): Point {
  return series.points[series.points.length - 1];
}

/** The point for a year, or undefined. */
export function at(series: Series, year: number): Point | undefined {
  return series.points.find((p) => p.year === year);
}

/** Percentage change from a to b, rounded to a whole number (negative = a fall). */
export function percentChange(a: number, b: number): number {
  return Math.round(((b - a) / a) * 100);
}

export type ValueFormat = "percent" | "rate" | "count";

/** 10.1% · 37.4 · 609,930 */
export function formatValue(value: number, format: ValueFormat): string {
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "rate") return value.toFixed(1);
  return Math.round(value).toLocaleString("en-US");
}

/** "$3,000" */
export function dollars(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
}

/** 609,930 */
export function wholeNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Round-number axis ticks from 0 up to at least `max` (about `count` steps).
 * Steps are 1, 2, 2.5 or 5 times a power of ten.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let t = 0; t < max + step * 0.999; t += step) ticks.push(Number(t.toPrecision(12)));
  return ticks;
}
