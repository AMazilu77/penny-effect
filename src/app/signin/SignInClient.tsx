"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

function SignInForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  const raw = sp.get("callbackUrl");
  const callbackUrl =
    !raw || raw.includes("/signin") ? "/dashboard" : raw;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1️⃣ Handle loading state
  if (status === "loading") {
    return <div className="p-6 text-center">Checking session…</div>;
  }

  // 2️⃣ Handle already-authenticated user
  if (status === "authenticated") {
    // Push to dashboard, but render nothing (avoids stuck "already logged in" panel)
    router.push("/dashboard");
    return null;
  }

  // 3️⃣ Render the actual sign-in form for unauthenticated users
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

// ✅ Wrap in Suspense for searchParams hydration
export default function SignInClient() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading sign-in…</div>}>
      <SignInForm />
    </Suspense>
  );
}
