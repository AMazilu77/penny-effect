// PATCH /api/profile: the signed-in user changes their own display name, bio
// or "show my name in collective totals" choice (Milestone 3.5).
// The user is always the one in the session; the body can't name anyone else
// (unknown keys are refused, see profileUpdateSchema).
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { firstIssue, profileUpdateSchema } from "@/lib/profile";
import { profileStore } from "@/lib/profile-store";
import { RULES } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-store";

export async function PATCH(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to change your profile." }, { status: 401 });

  try {
    const limited = await rateLimitResponse([{ rule: RULES.profileUser, identifier: userId }], "profile changes");
    if (limited) return limited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

    if (!(await profileStore.update(userId, parsed.data))) {
      return NextResponse.json({ error: "This account no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile] update", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Couldn't save your profile. Please try again." }, { status: 500 });
  }
}
