import { describe, expect, it } from "vitest";
import { findUnknownIds, interestsRequestSchema } from "@/lib/onboarding";

describe("interestsRequestSchema", () => {
  it("accepts a list of category ids and removes duplicates", () => {
    const parsed = interestsRequestSchema.parse({ categoryIds: ["a", "b", "a"] });
    expect(parsed.categoryIds).toEqual(["a", "b"]);
  });

  it("rejects an empty selection", () => {
    expect(interestsRequestSchema.safeParse({ categoryIds: [] }).success).toBe(false);
  });

  it("rejects the old request shape (free-text cause names)", () => {
    expect(interestsRequestSchema.safeParse({ causes: ["Environment"] }).success).toBe(false);
  });

  it("rejects non-string, blank and oversized ids", () => {
    expect(interestsRequestSchema.safeParse({ categoryIds: [123] }).success).toBe(false);
    expect(interestsRequestSchema.safeParse({ categoryIds: ["  "] }).success).toBe(false);
    expect(interestsRequestSchema.safeParse({ categoryIds: ["x".repeat(65)] }).success).toBe(false);
  });

  it("rejects more than 50 ids", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id${i}`);
    expect(interestsRequestSchema.safeParse({ categoryIds: ids }).success).toBe(false);
  });
});

describe("findUnknownIds", () => {
  it("returns nothing when every requested id exists", () => {
    expect(findUnknownIds(["a", "b"], ["a", "b", "c"])).toEqual([]);
  });

  it("returns the ids that don't exist", () => {
    expect(findUnknownIds(["a", "made-up"], ["a", "b"])).toEqual(["made-up"]);
  });
});
