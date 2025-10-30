// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { compare } from "bcrypt";
import { z } from "zod";

// ✅ Schema validation for credentials
const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ✅ Determine base URL explicitly
const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const authOptions: NextAuthOptions = {
  // ────────────────────────────────────────────────
  // CORE CONFIG
  // ────────────────────────────────────────────────
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable verbose logs (turn off in production if noisy)
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },

  // ────────────────────────────────────────────────
  // PROVIDERS
  // ────────────────────────────────────────────────
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // okay for dev
    }),

    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        // Validate incoming form data
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Look up user in DB
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        // Compare hashed password
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        // Return minimal safe shape
        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],

  // ────────────────────────────────────────────────
  // COOKIE SECURITY
  // ────────────────────────────────────────────────
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: baseUrl.startsWith("https://"), // true on Vercel
      },
    },
  },

  // ────────────────────────────────────────────────
  // CALLBACKS
  // ────────────────────────────────────────────────
  callbacks: {
    async jwt({ token, user }) {
      // On first login, merge user.id into token
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      // Attach the token.id to the session.user
      if (session.user && token?.id) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl: internalBase }) {
      // ✅ Ensure we never redirect to a different origin
      const realBase = process.env.NEXTAUTH_URL ?? internalBase;

      try {
        const u = new URL(url);
        if (u.origin === realBase) return u.toString(); // Same origin → allow
      } catch {
        if (url.startsWith("/")) return `${realBase}${url}`; // Relative path → allow
      }
      return realBase; // Fallback safe base
    },
  },
};
