import { describe, expect, it } from "vitest";
import { acceptedWebhookSecrets, isAuthorizedWebhookRequest, webhookConfigured } from "./auth";

const SECRET = "a".repeat(64);
const NEXT = "b".repeat(64);

describe("isAuthorizedWebhookRequest", () => {
  const env = { EVERYORG_WEBHOOK_SECRET: SECRET };

  it("accepts exactly `Bearer <secret>`", () => {
    expect(isAuthorizedWebhookRequest(`Bearer ${SECRET}`, env)).toBe(true);
  });

  it("rejects a missing, wrong or differently formatted header", () => {
    for (const header of [
      null,
      "",
      SECRET,
      `bearer ${SECRET}`,
      `Bearer  ${SECRET}`,
      `Bearer ${SECRET} `,
      `Basic ${SECRET}`,
      `Bearer ${SECRET.slice(1)}`,
      `Bearer ${"c".repeat(64)}`,
    ]) {
      expect(isAuthorizedWebhookRequest(header, env)).toBe(false);
    }
  });

  it("fails closed when the secret is missing or too short", () => {
    expect(isAuthorizedWebhookRequest("Bearer ", {})).toBe(false);
    expect(isAuthorizedWebhookRequest("Bearer undefined", {})).toBe(false);
    const short = "s".repeat(31);
    expect(isAuthorizedWebhookRequest(`Bearer ${short}`, { EVERYORG_WEBHOOK_SECRET: short })).toBe(false);
    expect(webhookConfigured({ EVERYORG_WEBHOOK_SECRET: short })).toBe(false);
  });

  it("accepts the rotation secret too", () => {
    const rotating = { EVERYORG_WEBHOOK_SECRET: SECRET, EVERYORG_WEBHOOK_SECRET_NEXT: NEXT };
    expect(isAuthorizedWebhookRequest(`Bearer ${SECRET}`, rotating)).toBe(true);
    expect(isAuthorizedWebhookRequest(`Bearer ${NEXT}`, rotating)).toBe(true);
    // NEXT alone also works (mid-rotation, main already removed).
    expect(isAuthorizedWebhookRequest(`Bearer ${NEXT}`, { EVERYORG_WEBHOOK_SECRET_NEXT: NEXT })).toBe(true);
  });

  it("refuses everything if the secret equals the public webhook_token", () => {
    const mixedUp = { EVERYORG_WEBHOOK_SECRET: SECRET, EVERYORG_WEBHOOK_TOKEN: SECRET };
    expect(isAuthorizedWebhookRequest(`Bearer ${SECRET}`, mixedUp)).toBe(false);
    expect(acceptedWebhookSecrets(mixedUp)).toEqual([]);
    expect(webhookConfigured(mixedUp)).toBe(false);
  });
});
