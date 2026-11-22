// /api/profile/avatar: the signed-in user's own profile picture.
//   GET    the picture (only to its owner for now; profiles are private)
//   POST   upload or replace (multipart form, field "file"; JPEG/PNG/WebP, ≤ 2 MB)
//   DELETE remove it (the page falls back to the Google avatar or initials)
// Uploads are rate limited per user (RULES.avatarUser) and re-encoded on the
// server (src/lib/avatar-image.ts); we never store the uploaded bytes.
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { checkAvatarUpload, uploadTooLarge } from "@/lib/avatar";
import { AvatarImageError, makeAvatar } from "@/lib/avatar-image";
import { avatarStore, avatarUrl } from "@/lib/avatar-store";
import { RULES } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-store";

export const runtime = "nodejs";

const unauthorized = () => NextResponse.json({ error: "Sign in to change your picture." }, { status: 401 });

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return new NextResponse(null, { status: 401 });
  const avatar = await avatarStore.get(userId);
  if (!avatar) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": "image/webp",
      // The page links to ?v=<version>, so a cached copy is never stale.
      // "private": only this browser may keep it, never a shared cache.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  try {
    const limited = await rateLimitResponse([{ rule: RULES.avatarUser, identifier: userId }], "picture uploads");
    if (limited) return limited;

    if (uploadTooLarge(req.headers.get("content-length"))) {
      return NextResponse.json({ error: "That picture is over 2 MB. Choose a smaller one." }, { status: 413 });
    }
    let file: FormDataEntryValue | null;
    try {
      file = (await req.formData()).get("file");
    } catch {
      return NextResponse.json({ error: "Choose a picture to upload." }, { status: 400 });
    }
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a picture to upload." }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkAvatarUpload(file, bytes);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    let avatar: Uint8Array;
    try {
      avatar = await makeAvatar(bytes);
    } catch (err) {
      if (err instanceof AvatarImageError) {
        return NextResponse.json({ error: "We couldn't read that picture. Try another JPEG, PNG or WebP." }, { status: 400 });
      }
      throw err;
    }
    const version = await avatarStore.save(userId, avatar);
    return NextResponse.json({ ok: true, url: avatarUrl(version) });
  } catch (err) {
    console.error("[profile] avatar upload", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Couldn't save your picture. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  try {
    await avatarStore.remove(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile] avatar remove", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Couldn't remove your picture. Please try again." }, { status: 500 });
  }
}
