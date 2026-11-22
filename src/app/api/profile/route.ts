// /api/profile (Milestone 3.5), always for the signed-in user only. The
// body can't name anyone else (unknown keys are refused).
//   PATCH   change display name, bio or "show my name in collective totals"
//   DELETE  delete the account: typed confirmation, plus the password for
//           accounts that have one. Donations are kept, anonymized
//           (src/lib/account-store.ts).
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { firstIssue, profileUpdateSchema } from "@/lib/profile";
import { profileStore } from "@/lib/profile-store";
import { ACCOUNT_ERRORS, accountDeletionSchema, deleteAccount } from "@/lib/account";
import { bcryptHasher, prismaAccountStore } from "@/lib/account-store";
import { clientIp, RULES } from "@/lib/rate-limit";
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

export async function DELETE(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });

  try {
    // It can check a password, so it shares the password-attempt limits.
    const limited = await rateLimitResponse(
      [
        { rule: RULES.passwordUser, identifier: userId },
        { rule: RULES.passwordIp, identifier: clientIp(req.headers) },
      ],
      "attempts",
    );
    if (limited) return limited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const parsed = accountDeletionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

    const result = await deleteAccount(prismaAccountStore, bcryptHasher, userId, parsed.data);
    if (!result.ok) {
      const { status, error } = ACCOUNT_ERRORS[result.reason];
      return NextResponse.json({ error: result.reason === "wrong-password" ? "Your password is incorrect." : error }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile] delete account", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Couldn't delete your account. Nothing was changed. Please try again." }, { status: 500 });
  }
}
