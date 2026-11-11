// lib/auth.ts
import { compare } from "bcrypt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
/** True when Google sign-in is configured; the sign-in pages show the button only then. */
export const googleSignInEnabled = Boolean(googleClientId && googleClientSecret);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await compare(credentials.password, user.passwordHash);
        return ok
          ? { id: user.id, email: user.email, name: user.name }
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
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      return session;
    },
  },
};
