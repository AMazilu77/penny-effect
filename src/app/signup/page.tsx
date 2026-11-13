"use client";

import { Card } from "@/components/ui/Card";
import { buttonPrimary, textLink } from "@/components/ui/buttons";
import { useState } from "react";
import { signIn } from "next-auth/react";

const field = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";

export default function SignUpPage() {
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

      // A full page load, not router.replace(): the client router may hold a
      // redirect it cached while signed out (see SignInClient.tsx).
      window.location.replace(
        statusRes.ok && statusData.hasCompletedOnboarding === false ? "/onboarding/interests" : "/feed",
      );
      return;
    } catch (err) {
      console.error("Signup error:", err);
      setMsg("Unexpected error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-5">
        <h1 className="text-center text-2xl font-bold">Create your account</h1>

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-heading">Name</span>
            <input
              autoComplete="name"
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-heading">Email</span>
            <input
              type="email"
              autoComplete="email"
              className={field}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-heading">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={field}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <button type="submit" disabled={loading} className={`${buttonPrimary} w-full disabled:cursor-wait`}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {msg && <p role="status" className="text-center text-sm">{msg}</p>}

        <p className="text-center text-sm">
          Already have an account?{" "}
          <a href="/signin" className={textLink}>
            Sign in
          </a>
        </p>
        <p className="text-center text-sm text-muted">
          Prefer Google? Use &ldquo;Continue with Google&rdquo; on the{" "}
          <a href="/signin" className={textLink}>
            sign-in page
          </a>
          .
        </p>
      </Card>
    </div>
  );
}
