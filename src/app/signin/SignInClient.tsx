"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Card } from "@/components/ui/Card";
import { buttonPrimary, textLink } from "@/components/ui/buttons";
import { BRAND_NAME } from "@/lib/brand";

const field = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";

export default function SignInClient({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean;
  initialError: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // 👇 Use redirect: false so we can manually control routing
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setErrorMsg("Invalid email or password");
        setLoading(false);
        return;
      }

      if (result?.ok) {
        // A full page load, not router.replace(): while signed out, the client
        // router prefetched /feed and cached its redirect back to /signin, so
        // a client-side navigation bounced users who finished onboarding back
        // to this page. A real navigation also loads the new session cleanly.
        const res = await fetch("/api/user/status");
        const data: { hasCompletedOnboarding?: boolean } = res.ok ? await res.json() : {};
        window.location.replace(data.hasCompletedOnboarding === false ? "/onboarding/interests" : "/feed");
        return;
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-5">
        <h1 className="text-center text-2xl font-bold">Sign in to {BRAND_NAME}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-heading">Email</span>
            <input type="email" autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-heading">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {errorMsg && (
            <p role="alert" className="rounded-control border border-danger bg-danger-soft p-3 text-center text-sm font-medium text-danger">
              {errorMsg}
            </p>
          )}

          <button type="submit" disabled={loading} className={`${buttonPrimary} w-full disabled:cursor-wait`}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <GoogleSignInButton />
          </>
        )}

        <p className="text-center text-sm">
          Don’t have an account?{" "}
          <a href="/signup" className={textLink}>
            Create one
          </a>
        </p>
      </Card>
    </div>
  );
}
