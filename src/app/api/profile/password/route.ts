// POST /api/profile/password: the signed-in user changes their own password
// (accounts with a password only; Google-only accounts have none).
// Rate limited per user and per IP, because it checks the current password.
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { ACCOUNT_ERRORS, changePassword, passwordChangeSchema } from "@/lib/account";
import { bcryptHasher, prismaAccountStore } from "@/lib/account-store";
import { firstIssue } from "@/lib/profile";
import { clientIp, RULES } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-store";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to change your password." }, { status: 401 });

  try {
    // Counted before the password check, so wrong guesses use up the quota.
    const limited = await rateLimitResponse(
      [
        { rule: RULES.passwordUser, identifier: userId },
        { rule: RULES.passwordIp, identifier: clientIp(req.headers) },
      ],
      "password attempts",
    );
    if (limited) return limited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

    const result = await changePassword(prismaAccountStore, bcryptHasher, userId, parsed.data);
    if (!result.ok) {
      const { status, error } = ACCOUNT_ERRORS[result.reason];
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never log the request: it contains passwords.
    console.error("[profile] password", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Couldn't change your password. Please try again." }, { status: 500 });
  }
}
