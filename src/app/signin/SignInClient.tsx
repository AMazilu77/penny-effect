"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // ✅ Use redirect:false so we can control what happens next
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      console.log("🔹 signIn result:", result);

      if (result?.error) {
        setErrorMsg("Invalid email or password");
        setLoading(false);
        return;
      }

      if (result?.ok) {
        console.log("✅ Login successful — redirecting to /feed");
        // ✅ Force redirect manually after short delay
        setTimeout(() => {
          router.push("/feed");
          router.refresh();
        }, 150);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Something went wrong. Please try again.");
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

      <p className="text-center text-sm mt-3">
        Don’t have an account?{" "}
        <a href="/signup" className="text-emerald-600 hover:underline">
          Create one
        </a>
      </p>
    </div>
  );
}
