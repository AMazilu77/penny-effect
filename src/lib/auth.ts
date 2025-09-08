// lib/auth.ts (single source of truth)
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { compare } from "bcrypt";
import { z } from "zod";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),       // keep adapter for Users/Accounts
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },         // ✅ JWT sessions

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // dev only
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        // Return minimal safe shape with a string id
        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],

  debug: true,

  callbacks: {
    async jwt({ token, user }) {
      // On first login merge user.id into token so middleware can authorize
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) (session.user as any).id = token.id as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try { const u = new URL(url); if (u.origin === baseUrl) return url; } catch {}
      return baseUrl;
    },
  },
};
