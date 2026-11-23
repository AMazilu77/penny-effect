import { describe, expect, it } from "vitest";
import { topSupported, type OrgGiving } from "./top-supported";

const oceans = { id: "c-oceans", name: "Oceans", slug: "oceans" };
const health = { id: "c-health", name: "Global Health", slug: "global-health" };

function row(id: string, name: string, totalCents: number, gifts: number, categories = [oceans]): OrgGiving {
  return { organization: { id, name, slug: id, categories }, totalCents, gifts };
}

describe("topSupported", () => {
  it("is empty with no completed gifts", () => {
    expect(topSupported([])).toEqual({ organization: null, cause: null });
  });

  it("picks the organization with the largest total, with its total and number of gifts", () => {
    const top = topSupported([row("a", "Alpha", 2_500, 5), row("b", "Beta", 4_000, 1)]);
    expect(top.organization).toEqual({ id: "b", name: "Beta", slug: "b", totalCents: 4_000, gifts: 1 });
  });

  it("breaks a tie on total by number of gifts, then by name", () => {
    expect(topSupported([row("a", "Alpha", 1_000, 1), row("b", "Beta", 1_000, 3)]).organization?.id).toBe("b");
    expect(topSupported([row("z", "Zeta", 1_000, 2), row("a", "Alpha", 1_000, 2)]).organization?.id).toBe("a");
  });

  it("sums a cause over its organizations, so the top cause can differ from the top organization's cause", () => {
    const top = topSupported([
      row("big", "Big Health Org", 5_000, 1, [health]),
      row("o1", "Ocean One", 3_000, 2, [oceans]),
      row("o2", "Ocean Two", 3_000, 1, [oceans]),
    ]);
    expect(top.organization?.id).toBe("big");
    expect(top.cause).toEqual({ id: "c-oceans", name: "Oceans", slug: "oceans", totalCents: 6_000, gifts: 3 });
  });

  it("counts a gift in full toward each cause of its organization, once per cause", () => {
    const top = topSupported([row("x", "Both", 2_000, 2, [oceans, health, oceans])]);
    expect(top.cause).toEqual({ id: "c-health", name: "Global Health", slug: "global-health", totalCents: 2_000, gifts: 2 });
  });

  it("has a top organization but no top cause when the organizations have no cause", () => {
    const top = topSupported([row("a", "Alpha", 1_000, 1, [])]);
    expect(top.organization?.id).toBe("a");
    expect(top.cause).toBeNull();
  });

  it("ignores rows with nothing given", () => {
    expect(topSupported([row("a", "Alpha", 0, 0)])).toEqual({ organization: null, cause: null });
  });
});
