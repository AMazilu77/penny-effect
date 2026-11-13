"use client";

import { signIn } from "next-auth/react";
import { buttonSecondary } from "@/components/ui/buttons";

// After Google, /auth/continue sends new users to onboarding and returning users to the feed.
export function GoogleSignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/auth/continue" })}
      className={`${buttonSecondary} w-full`}
    >
      Continue with Google
    </button>
  );
}
