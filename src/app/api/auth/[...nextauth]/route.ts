import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { compare } from "bcrypt";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // For v4 you can choose 'jwt' or 'database'. We'll keep 'database' like before.
  session: { strategy: "database" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // account linking rules can be added later
    }),

    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return user;
      },
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      // expose user.id on the client
      if (session.user) (session.user as any).id = user.id;
      return session;
    },
  },
};

// v4 App Router route handler wiring
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
