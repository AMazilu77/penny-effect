import { describe, expect, it } from "vitest";
import { countByCategory, filterDirectory, parseDiscoverParams } from "@/lib/directory";

const orgs = [
  { id: "1", name: "The Against Malaria Foundation", description: "Funds insecticidal nets.", categorySlugs: ["medical-research", "highest-impact"] },
  { id: "2", name: "GiveDirectly", description: "Sends cash to people in extreme poverty.", categorySlugs: ["humanitarian-aid", "highest-impact"] },
  { id: "3", name: "Médecins Sans Frontières", description: null, categorySlugs: ["humanitarian-aid"] },
  { id: "4", name: "100% Literacy_Fund", description: "Books.", categorySlugs: ["education"] },
];

describe("parseDiscoverParams", () => {
  it("reads a valid category slug and a trimmed search", () => {
    expect(parseDiscoverParams({ category: " Highest-Impact ", q: "  malaria   nets " })).toEqual({ category: "highest-impact", q: "malaria nets" });
  });

  it("ignores repeated, malformed or oversized values", () => {
    expect(parseDiscoverParams({ category: ["a", "b"], q: ["x"] })).toEqual({ category: null, q: "" });
    expect(parseDiscoverParams({ category: "<script>" }).category).toBeNull();
    expect(parseDiscoverParams({ q: "x".repeat(500) }).q).toHaveLength(100);
    expect(parseDiscoverParams({})).toEqual({ category: null, q: "" });
  });
});

describe("filterDirectory", () => {
  it("returns everything without filters", () => {
    expect(filterDirectory(orgs, { category: null, q: "" })).toHaveLength(4);
  });

  it("filters by category", () => {
    expect(filterDirectory(orgs, { category: "highest-impact", q: "" }).map((o) => o.id)).toEqual(["1", "2"]);
    expect(filterDirectory(orgs, { category: "space-science", q: "" })).toEqual([]);
  });

  it("searches name and description, case- and accent-insensitive, all words", () => {
    expect(filterDirectory(orgs, { category: null, q: "MALARIA" }).map((o) => o.id)).toEqual(["1"]);
    expect(filterDirectory(orgs, { category: null, q: "cash poverty" }).map((o) => o.id)).toEqual(["2"]);
    expect(filterDirectory(orgs, { category: null, q: "medecins" }).map((o) => o.id)).toEqual(["3"]);
    expect(filterDirectory(orgs, { category: null, q: "cash nets" })).toEqual([]);
  });

  it("treats % and _ as plain characters", () => {
    expect(filterDirectory(orgs, { category: null, q: "%" }).map((o) => o.id)).toEqual(["4"]);
    expect(filterDirectory(orgs, { category: null, q: "y_f" }).map((o) => o.id)).toEqual(["4"]);
    expect(filterDirectory(orgs, { category: null, q: "_" }).map((o) => o.id)).toEqual(["4"]);
  });

  it("combines category and search", () => {
    expect(filterDirectory(orgs, { category: "humanitarian-aid", q: "give" }).map((o) => o.id)).toEqual(["2"]);
  });
});

describe("countByCategory", () => {
  it("counts organizations per category", () => {
    const counts = countByCategory(orgs);
    expect(counts.get("highest-impact")).toBe(2);
    expect(counts.get("humanitarian-aid")).toBe(2);
    expect(counts.get("space-science")).toBeUndefined();
  });
});
