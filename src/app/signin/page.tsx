// app/signin/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, googleSignInEnabled } from "@/lib/auth";
import { signInErrorMessage } from "@/lib/auth-errors";
import SignInClient from "./SignInClient";

export default async function SignInPage({
  searchParams,
}: {
  // Next.js 16: page searchParams are a Promise.
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/feed");

  const { error } = await searchParams;
  return (
    <SignInClient
      googleEnabled={googleSignInEnabled}
      initialError={signInErrorMessage(error) ?? ""}
    />
  );
}
