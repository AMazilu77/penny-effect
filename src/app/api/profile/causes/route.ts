// PUT /api/profile/causes: the signed-in user replaces the causes they
// follow. Same validation as onboarding (existing category ids only, zod),
// through the same saveInterests().
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { interestsRequestSchema } from "@/lib/onboarding";
import { saveInterests } from "@/lib/interests-store";
import { firstIssue } from "@/lib/profile";
import { RULES } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-store";

export async function PUT(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to change your causes." }, { status: 401 });

  try {
    const limited = await rateLimitResponse([{ rule: RULES.profileUser, identifier: userId }], "profile changes");
    if (limited) return limited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const parsed = interestsRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

    const result = await saveInterests(userId, parsed.data.categoryIds);
    if (!result.ok) return NextResponse.json({ error: "One of those causes doesn't exist. Reload the page and try again." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile] causes", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Couldn't save your causes. Please try again." }, { status: 500 });
  }
}
