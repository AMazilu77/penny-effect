import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { interestsRequestSchema } from "@/lib/onboarding";
import { saveInterests } from "@/lib/interests-store";

// Saves the causes a user picked during onboarding and marks onboarding done.
// The profile page saves causes the same way (PUT /api/profile/causes).
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = interestsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Only existing categories can be followed.
    const result = await saveInterests(userId, parsed.data.categoryIds);
    if (!result.ok) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding error:", err instanceof Error ? err.name : "unknown error");
    // Don't send internal error details to the browser.
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
