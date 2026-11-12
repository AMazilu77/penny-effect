// Server-side guards for the admin area (/admin pages and /api/admin routes).
// `src/proxy.ts` already turns away signed-out visitors and non-admins using
// the sign-in token, but that token can be stale, so every admin page and
// handler calls one of these, which check the role in the database.
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decideAdminAccess, type AdminAccess } from "@/lib/admin-access";

async function currentAdminAccess(): Promise<AdminAccess> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return decideAdminAccess(null, null);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return decideAdminAccess(userId, user?.role);
}

/**
 * For admin pages and layouts (Server Components). Returns the admin's user
 * id; otherwise sends signed-out visitors to /signin and shows everyone else
 * a 404, so the area doesn't advertise itself.
 */
export async function requireAdminPage(): Promise<{ userId: string }> {
  const access = await currentAdminAccess();
  if (access.ok) return { userId: access.userId };
  if (access.reason === "signed-out") redirect("/signin");
  notFound();
}

/**
 * For /api/admin route handlers. Returns `{ userId }` for an admin, or a
 * JSON error response to return as-is:
 *
 *   const admin = await requireAdminApi();
 *   if (admin instanceof NextResponse) return admin;
 */
export async function requireAdminApi(): Promise<{ userId: string } | NextResponse> {
  const access = await currentAdminAccess();
  if (access.ok) return { userId: access.userId };
  return access.reason === "signed-out"
    ? NextResponse.json({ error: "Not signed in" }, { status: 401 })
    : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
