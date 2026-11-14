import { NextResponse } from "next/server";
import { checkoutEnabled } from "@/lib/checkout";
import { isAuthorizedWebhookRequest } from "@/lib/everyorg-webhook/auth";
import { processPartnerWebhook } from "@/lib/everyorg-webhook/process";
import { prismaWebhookStore } from "@/lib/everyorg-webhook/store";

// Every.org partner webhook (M3-PLAN §2). The ONLY place a gift becomes
// COMPLETED (or REFUNDED/DISPUTED). A redirect back to our site never does.
//
// Order of checks, cheapest and safest first:
// 1. Checkout off (always on production until go-live) → 404.
// 2. No valid `Authorization: Bearer <EVERYORG_WEBHOOK_SECRET>` → bare 401.
//    Nothing is stored, so guesses can't fill the database.
// 3. Not JSON, or too big → 415 / 413.
// 4. Authenticated: always 200 (even when the payload doesn't match our
//    records) so Every.org doesn't retry forever. What happened is in the
//    PartnerEvent audit table. 500 only on our own failure, so Every.org retries.
// Other HTTP methods get Next's automatic 405.

export const dynamic = "force-dynamic";

/** Every.org's documented payload is well under 2 KB. */
const MAX_BODY_BYTES = 64 * 1024;

const empty = (status: number) => new NextResponse(null, { status });

export async function POST(req: Request) {
  if (!checkoutEnabled()) return empty(404);
  if (!isAuthorizedWebhookRequest(req.headers.get("authorization"))) return empty(401);

  const contentType = req.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(contentType)) return empty(415);
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return empty(413);

  let text: string;
  try {
    text = await req.text();
  } catch {
    return empty(400);
  }
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return empty(413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined; // recorded as REJECTED "not valid JSON"
  }

  try {
    const result = await processPartnerWebhook(prismaWebhookStore, body, new Date());
    // Log the outcome only: no payload, no donor data, no headers.
    if (result.status === "REJECTED") {
      console.warn(`Every.org webhook rejected (${result.kind}): ${result.reason}`);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Every.org webhook failed:", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
