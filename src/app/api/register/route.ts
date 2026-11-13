// app/api/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { z } from "zod";
import { normalizeEmail } from "@/lib/email";
import { findUserIdByEmail } from "@/lib/user-lookup";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  // Stored lowercased; "Alice@x.com" and "alice@x.com" are the same account.
  email: z.string().trim().max(254).pipe(z.email()).transform(normalizeEmail),
  password: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a name, a valid email and a password of at least 6 characters." }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  try {
    // Case-insensitive, so an older "Alice@x.com" account blocks "alice@x.com".
    if (await findUserIdByEmail(email)) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: new Date(),
        hasCompletedOnboarding: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Don't log the request (it contains the password); the error alone is enough.
    console.error("[register]", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
