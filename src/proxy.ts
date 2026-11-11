import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/protected-routes";

// Next.js 16 renamed "middleware" to "proxy": this runs before every matched request.
// It sends signed-out visitors away from signed-in pages (see lib/protected-routes.ts).
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public pages and API routes pass straight through; API handlers check
  // the session themselves.
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/signin", req.url));

  return NextResponse.next();
}

// Skip Next's static assets. The matcher must be a literal (Next reads it at build time).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
