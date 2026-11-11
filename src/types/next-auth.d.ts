// Tells TypeScript about the extra fields our NextAuth callbacks add
// (see `callbacks` in src/lib/auth.ts), so code can use `session.user.id`
// without casting to `any`.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
