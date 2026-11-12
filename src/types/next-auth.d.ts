// Tells TypeScript about the extra fields our NextAuth callbacks add
// (see `callbacks` in src/lib/auth.ts), so code can use `session.user.id`
// and `session.user.role` without casting to `any`.
import type { DefaultSession } from "next-auth";

type AppRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: AppRole } & DefaultSession["user"];
  }
  // What `authorize` (Credentials) and the Prisma adapter (Google) hand to
  // the jwt callback at sign-in.
  interface User {
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    /**
     * Copied from the database at sign-in. Only a coarse gate for the proxy:
     * admin pages and handlers re-check the role in the database.
     */
    role?: AppRole;
  }
}
