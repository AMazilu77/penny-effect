// src/app/signin/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignInClient from "./SignInClient";

export default async function SignInPage() {
  // Server-side check: if user already logged in, skip the form entirely
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  // Otherwise, render the client form
  return <SignInClient />;
}
