// app/page.tsx
"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { buttonPrimary, buttonSecondary, textLink } from "@/components/ui/buttons";
import { BRAND_NAME } from "@/lib/brand";

export default function LandingPage() {
  return (
    <section className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center overflow-hidden text-center">
      <span aria-hidden className="lorenz-mark pointer-events-none absolute inset-x-0 top-0 mx-auto h-[28rem] w-[26rem] opacity-[0.07]" />
      <div className="relative space-y-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Welcome to {BRAND_NAME}</h1>
        <p className="mx-auto max-w-2xl text-lg">
          Small, regular gifts to verified nonprofits, honestly counted. Pick the causes you care about,
          follow what those organizations publish, and see exactly what you&apos;ve given.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={`${buttonPrimary} px-6 py-3 text-base`}>
            Join now
          </Link>
          <Link href="/about" className={`${buttonSecondary} px-6 py-3 text-base`}>
            Learn more
          </Link>
        </div>
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <button onClick={() => signIn()} className={textLink}>
            Sign in
          </button>
        </p>
      </div>
    </section>
  );
}
