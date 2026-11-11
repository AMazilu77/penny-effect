// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
// Route files should only export HTTP handlers. Import authOptions from "@/lib/auth".
export { handler as GET, handler as POST };
