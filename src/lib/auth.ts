// lib/auth.ts
import { compare } from "bcrypt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import { findUserIdByEmail } from "@/lib/user-lookup";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { prismaRateLimitStore } from "@/lib/rate-limit-store";
import type { NextAuthOptions } from "next-auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
/** True when Google sign-in is configured; the sign-in pages show the button only then. */
export const googleSignInEnabled = Boolean(googleClientId && googleClientSecret);

/** Error code the sign-in form shows as "too many attempts" (src/lib/auth-errors.ts). */
export const RATE_LIMITED_ERROR = "RateLimited";

// The stock Prisma adapter matches emails exactly. Ours ignores case, so a
// Google sign-in as alice@x.com finds an existing "Alice@x.com" account (and
// is then refused with OAuthAccountNotLinked, as designed) instead of
// silently creating a second account. New users are stored lowercased.
const prismaAdapter = PrismaAdapter(prisma);
const adapter: Adapter = {
  ...prismaAdapter,
  async getUserByEmail(email) {
    const id = await findUserIdByEmail(email);
    return id ? (prismaAdapter.getUser?.(id) ?? null) : null;
  },
  async createUser(user: Omit<AdapterUser, "id">) {
    if (!prismaAdapter.createUser) throw new Error("Prisma adapter has no createUser");
    return prismaAdapter.createUser({ ...user, email: normalizeEmail(user.email) });
  },
};

export const authOptions: NextAuthOptions = {
  adapter,
  secret: process.env.NEXTAUTH_SECRET,
  // Errors (e.g. ?error=OAuthAccountNotLinked) are shown on our own sign-in page.
  pages: { signIn: "/signin", error: "/signin" },
  session: { strategy: "jwt" },
  debug: false,

  providers: [
    // Google sign-in. No automatic account linking (allowDangerousEmailAccountLinking
    // stays off): if a password account already uses the same email, NextAuth refuses
    // with OAuthAccountNotLinked and the user signs in with their password instead.
    ...(googleClientId && googleClientSecret
      ? [GoogleProvider({ clientId: googleClientId, clientSecret: googleClientSecret })]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;

        // Rate limit per IP and per email (D-018), before the password check,
        // so guessing passwords is slow whichever way it's spread. The thrown
        // code reaches the sign-in form as `error: "RateLimited"`.
        const headers = new Headers();
        for (const [name, value] of Object.entries(req?.headers ?? {})) {
          if (typeof value === "string") headers.set(name, value);
        }
        const limited = await rateLimit(prismaRateLimitStore, [
          { rule: RULES.signInIp, identifier: clientIp(headers) },
          { rule: RULES.signInEmail, identifier: normalizeEmail(credentials.email) },
        ]);
        if (!limited.ok) throw new Error(RATE_LIMITED_ERROR);

        // Case-insensitive, so accounts stored with uppercase letters
        // (before emails were lowercased) can still sign in.
        const userId = await findUserIdByEmail(credentials.email);
        const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
        if (!user || !user.passwordHash) return null;

        const ok = await compare(credentials.password, user.passwordHash);
        return ok
          ? { id: user.id, email: user.email, name: user.name, role: user.role }
          : null;
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      // Only accept Google accounts whose email Google has verified.
      if (account?.provider === "google") {
        return (profile as GoogleProfile | undefined)?.email_verified === true;
      }
      return true;
    },
    // `user` is only present at sign-in. The role is copied into the token
    // then, so a newly granted admin must sign out and back in. Revoking works
    // at once, because admin pages and handlers re-check the database
    // (src/lib/admin.ts).
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role === "ADMIN" ? "ADMIN" : "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      if (session.user) session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      return session;
    },
  },
};
