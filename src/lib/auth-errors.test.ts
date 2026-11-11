import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "@/lib/auth-errors";

describe("signInErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage("")).toBeNull();
    expect(signInErrorMessage([])).toBeNull();
  });

  it("explains that an existing password account must use its password", () => {
    expect(signInErrorMessage("OAuthAccountNotLinked")).toMatch(/Sign in with your email and password/);
  });

  it("explains a refused Google sign-in", () => {
    expect(signInErrorMessage("AccessDenied")).toMatch(/verified email/);
  });

  it("uses the first value when the param repeats", () => {
    expect(signInErrorMessage(["AccessDenied", "Other"])).toMatch(/verified email/);
  });

  it("falls back to a generic message for unknown codes, never echoing them", () => {
    const message = signInErrorMessage("<script>alert(1)</script>");
    expect(message).toBe("Sign-in failed. Please try again.");
  });
});
