"use client";

import { signIn } from "next-auth/react";

// After Google, /auth/continue sends new users to onboarding and returning users to the feed.
export function GoogleSignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/auth/continue" })}
      className="w-full p-2 rounded border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
    >
      Continue with Google
    </button>
  );
}
