// app/page.tsx
"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <h1 className="text-4xl font-bold mb-4 text-center">Welcome to The Penny Effect</h1>
      <p className="max-w-2xl text-center text-lg mb-8">
        Micro-donations that add up to real change. Join a global network of small givers 
        creating massive collective impact — one penny at a time.
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => signIn()}
          className="px-6 py-3 rounded-md bg-primary text-white font-semibold hover:opacity-90 transition"
        >
          Join Now
        </button>

        <Link
          href="/about"
          className="px-6 py-3 rounded-md border border-primary text-primary font-semibold hover:bg-primary/10 transition"
        >
          Learn More
        </Link>
      </div>

      <div className="mt-12 text-sm text-muted-foreground">
        Already have an account?{" "}
        <button onClick={() => signIn()} className="text-primary underline">
          Log in
        </button>
      </div>
    </div>
  );
}
