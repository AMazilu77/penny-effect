// app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMsg("Account created! Redirecting...");
      setTimeout(() => router.push("/signin"), 1500);
    } else {
      const data = await res.json();
      setMsg(data?.error ?? "Something went wrong");
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Create Account</h1>
      <form onSubmit={submit} className="space-y-2">
        <input
          className="w-full border p-2 rounded"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          Sign up
        </button>
      </form>
      {msg && <p className="text-sm text-center">{msg}</p>}
    </div>
  );
}
