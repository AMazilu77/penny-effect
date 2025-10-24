import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // ✅ Allow these routes through without checks
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/debug") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // 🔒 Protect dashboard (and any nested routes)
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  return NextResponse.next();
}

// ⚙️ Matcher configuration
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
