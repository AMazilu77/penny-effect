"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

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
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold text-center">
        Sign in to <span className="text-emerald-600">Penny Effect</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          className="w-full border border-gray-300 bg-white p-2 rounded text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="w-full border border-gray-300 bg-white p-2 rounded text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {errorMsg && (
          <p className="text-red-500 text-sm text-center">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-2 rounded text-white font-medium transition-colors ${
            loading
              ? "bg-emerald-400 cursor-wait"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            or
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <GoogleSignInButton />
        </>
      )}

      <p className="text-center text-sm mt-3">
        Don’t have an account?{" "}
        <a href="/signup" className="text-emerald-600 hover:underline">
          Create one
        </a>
      </p>
    </div>
  );
}
