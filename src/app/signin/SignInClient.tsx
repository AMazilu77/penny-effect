// src/app/signin/SignInClient.tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

function Inner() {
  const { status } = useSession();
  const sp = useSearchParams();
  const router = useRouter();

  // ✅ Guard against self-redirects
  const raw = sp.get("callbackUrl");
  const callbackUrl =
    !raw || raw.includes("/signin") ? "/dashboard" : raw;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (status === "authenticated") {
    return (
      <div className="mx-auto max-w-sm p-6 text-center space-y-4">
        <h2 className="text-lg font-semibold">You’re already signed in.</h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-xl font-semibold">Sign in to Penny Effect</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const res = await signIn("credentials", {
            email,
            password,
            callbackUrl,
            redirect: false,
          });
          if (res?.error) setErrorMsg(res.error);
          else router.push(callbackUrl);
          setSubmitting(false);
        }}
      >
        <input
          type="email"
          className="border w-full p-2 rounded mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="border w-full p-2 rounded mb-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {errorMsg && <p className="text-red-500">{errorMsg}</p>}
        <button
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function SignInClient() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading sign-in…</div>}>
      <Inner />
    </Suspense>
  );
}
