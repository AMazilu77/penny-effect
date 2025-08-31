// app/api/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcrypt";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name ?? null, email, passwordHash },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
