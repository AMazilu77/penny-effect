import { describe, expect, it } from "vitest";
import { formatCents, parseDollarsToCents } from "@/lib/money";

describe("parseDollarsToCents", () => {
  it.each([
    ["5", 500],
    ["5.5", 550],
    ["5.50", 550],
    ["0.99", 99],
    ["  12.34  ", 1234],
    ["1.13", 113], // 1.13 * 100 in floating point is 112.99999999999999
    ["9999999.99", 999999999],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseDollarsToCents(input)).toBe(cents);
  });

  it("accepts plain numbers from JSON", () => {
    expect(parseDollarsToCents(5)).toBe(500);
    expect(parseDollarsToCents(5.5)).toBe(550);
    expect(parseDollarsToCents(0.29)).toBe(29); // 0.29 * 100 = 28.999999999999996
  });

  it.each([
    "",
    "abc",
    "-5",
    "+5",
    "5.",
    ".5",
    "5.999",
    "1e3",
    "1,000",
    "$5",
    "10000000", // more than 7 whole-dollar digits
  ])("rejects %j", (input) => {
    expect(parseDollarsToCents(input)).toBeNull();
  });

  it("rejects non-finite and imprecise numbers", () => {
    expect(parseDollarsToCents(Number.NaN)).toBeNull();
    expect(parseDollarsToCents(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseDollarsToCents(-1)).toBeNull();
    expect(parseDollarsToCents(0.1 + 0.2)).toBeNull(); // 0.30000000000000004
  });
});

describe("formatCents", () => {
  it("formats cents as US dollars", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(1050)).toBe("$10.50");
    expect(formatCents(123456)).toBe("$1,234.56");
  });
});
