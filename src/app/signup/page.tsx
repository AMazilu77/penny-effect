"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      // 1️⃣ Create account
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      // 2️⃣ Automatically sign them in
      const loginResult = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });

      if (loginResult?.error) {
        setMsg("Account created, but sign-in failed. Please log in manually.");
        setLoading(false);
        return;
      }

      // 3️⃣ Check onboarding status
      const statusRes = await fetch("/api/user/status");
      const statusData = await statusRes.json();

      if (statusRes.ok && statusData.hasCompletedOnboarding === false) {
        console.log("🆕 New user — redirecting to onboarding...");
        router.replace("/onboarding/interests");
      } else {
        console.log("Returning user — redirecting to feed...");
        router.replace("/feed");
      }

      router.refresh();
    } catch (err) {
      console.error("Signup error:", err);
      setMsg("Unexpected error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold text-center">
        Create your <span className="text-emerald-600">Penny Effect</span> account
      </h1>

      <form onSubmit={submit} className="space-y-2">
        <input
          className="w-full border p-2 rounded"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white p-2 rounded transition-colors ${
            loading
              ? "bg-emerald-400 cursor-wait"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      {msg && <p className="text-sm text-center mt-2">{msg}</p>}

      <p className="text-center text-sm mt-3">
        Already have an account?{" "}
        <a href="/signin" className="text-emerald-600 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
