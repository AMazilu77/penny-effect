// /api/profile/area (local nonprofits, D-028): the signed-in user's
// "My area". Coarse only: a region, or a city with its state, or none.
//   PUT  { kind: "none" } | { kind: "region", regionSlug } | { kind: "city", state, city }
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { myAreaSchema } from "@/lib/area";
import { firstIssue } from "@/lib/profile";
import { saveMyArea } from "@/lib/area-store";
import { RULES } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-store";

export async function PUT(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to set your area." }, { status: 401 });

  try {
    const limited = await rateLimitResponse([{ rule: RULES.profileUser, identifier: userId }], "profile changes");
    if (limited) return limited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const parsed = myAreaSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error, "Choose a region or a city.") }, { status: 400 });

    const result = await saveMyArea(userId, parsed.data);
    if (!result.ok) {
      return result.reason === "unknown-region"
        ? NextResponse.json({ error: "That region doesn't exist any more. Reload and choose again." }, { status: 400 })
        : NextResponse.json({ error: "This account no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile] area", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Couldn't save your area. Please try again." }, { status: 500 });
  }
}
