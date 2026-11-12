import { describe, expect, it } from "vitest";
import { normalizeEmail, pickAccountForEmail } from "@/lib/email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Alice.Smith@Example.COM ")).toBe("alice.smith@example.com");
    expect(normalizeEmail("a_b@x.io")).toBe("a_b@x.io");
  });
});

describe("pickAccountForEmail", () => {
  const legacyUpper = { id: "u1", email: "Alice@Example.com" };
  const lower = { id: "u2", email: "alice@example.com" };

  it("returns the only match, whatever case was typed (no lockout for old uppercase rows)", () => {
    expect(pickAccountForEmail([legacyUpper], "alice@example.com")).toBe(legacyUpper);
    expect(pickAccountForEmail([legacyUpper], "ALICE@EXAMPLE.COM")).toBe(legacyUpper);
  });

  it("returns null when nothing matches", () => {
    expect(pickAccountForEmail([], "alice@example.com")).toBeNull();
  });

  it("with case-duplicates, uses the exact match or refuses to guess", () => {
    expect(pickAccountForEmail([legacyUpper, lower], " Alice@Example.com ")).toBe(legacyUpper);
    expect(pickAccountForEmail([legacyUpper, lower], "alice@example.com")).toBe(lower);
    expect(pickAccountForEmail([legacyUpper, lower], "ALICE@example.com")).toBeNull();
  });
});
