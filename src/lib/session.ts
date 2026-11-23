// The signed-in user's id for route handlers, from the session (never from
// the request body), or null when nobody is signed in.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
