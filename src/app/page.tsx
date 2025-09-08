"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Landing() {
  const { status } = useSession();
  const authed = status === "authenticated";

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <section>
        <h1 className="text-3xl font-bold">The Penny Effect</h1>
        <p className="text-sm text-neutral-600">
          Micro-donations that add up. Round up purchases and route spare change to vetted charities.
        </p>
      </section>

      {!authed ? (
        <Link href="/signin" className="inline-block rounded border px-4 py-2">
          Sign in
        </Link>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded border px-4 py-2">Go to Dashboard</Link>
          <button className="rounded border px-4 py-2" onClick={() => signOut()}>
            Log out
          </button>
        </div>
      )}
    </main>
  );
}

