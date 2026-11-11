// First test: proves the test runner, the "@/" alias and CI are wired up.
// Business-logic tests (amount handling in cents, donation recording,
// onboarding validation) arrive with the Milestone 1 changes that add that logic.
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names and skips falsy values", () => {
    expect(cn("px-2", false, undefined, "py-1")).toBe("px-2 py-1");
  });

  it("lets later Tailwind classes override conflicting earlier ones", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
