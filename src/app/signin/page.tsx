"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

// 🧱 Extracted inner component for hooks like useSearchParams()
function SignInInner() {
  const { status, data } = useSession();
  const sp = useSearchParams();
  const router = useRouter();

  const callbackUrl = sp.get("callbackUrl") || "/dashboard";
  const errorFromQuery = sp.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🧭 Already signed in → simple panel
  if (status === "authenticated") {
    return (
      <div className="mx-auto max-w-sm p-6 space-y-4">
        <h1 className="text-2xl font-semibold">You’re signed in</h1>
        <p className="text-sm text-neutral-600">
          {data?.user?.email ?? data?.user?.name ?? "Signed in"}
        </p>
        <div className="flex gap-3">
          <button
            className="border rounded px-4 py-2"
            onClick={() => router.replace(callbackUrl)}
          >
            Go to Dashboard
          </button>
          <button className="border rounded px-4 py-2" onClick={() => signOut()}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {(errorMsg || errorFromQuery) && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-700">
          {errorMsg ??
            (errorFromQuery === "CredentialsSignin"
              ? "Invalid email or password."
              : "Sign-in error.")}
        </p>
      )}

      {/* Google sign-in */}
      <button
        className="w-full border p-2 rounded"
        onClick={() => signIn("google", { callbackUrl })}
        disabled={status === "loading" || submitting}
      >
        Continue with Google
      </button>

      <div className="h-px bg-gray-200" />

      {/* Email/Password sign-in */}
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setErrorMsg(null);

          const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl,
          });

          setSubmitting(false);

          if (res?.ok) {
            router.replace(res.url ?? callbackUrl);
            router.refresh();
          } else {
            const msg =
              res?.error === "CredentialsSignin"
                ? "Invalid email or password."
                : res?.error || "Sign-in error.";
            setErrorMsg(msg);
          }
        }}
      >
        <input
          className="w-full border p-2 rounded"
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Sign in with Email"}
        </button>
      </form>

      <a href="/signup" className="text-blue-600 underline text-sm block">
        Need an account? Create one
      </a>
    </div>
  );
}

// 🧩 Outer component wraps inner one in Suspense boundary
export default function SignInPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading sign-in...</div>}>
      <SignInInner />
    </Suspense>
  );
}
