import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

const SECRET = "a".repeat(64);

describe("isAuthorizedCronRequest", () => {
  it("accepts exactly `Bearer <CRON_SECRET>`", () => {
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a missing, wrong or differently formatted header", () => {
    expect(isAuthorizedCronRequest(null, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest("", SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer ${"b".repeat(64)}`, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer ${SECRET} `, SECRET)).toBe(false);
  });

  it("refuses everything when the secret is unset or too short (fails closed)", () => {
    expect(isAuthorizedCronRequest("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer short", "short")).toBe(false);
  });
});
