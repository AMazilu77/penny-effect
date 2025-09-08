import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // If middleware is active this should already be authed,
  // but we’ll handle the edge case with a soft message.
  if (!session) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p>Not signed in. <Link href="/signin">Sign in</Link></p>
      </main>
    );
  }

  const firstName =
    (session.user?.name?.split(" ")[0] ?? "") ||
    (session.user?.email?.split("@")[0] ?? "Friend");

    
  return (
    <main className="p-6 space-y-6">
      {/* Hero */}
      <section className="rounded-2xl border p-6">
        <h1 className="text-2xl font-semibold">Welcome, {firstName} 👋</h1>
        <p className="mt-2 text-sm text-gray-600">
          The Penny Effect lets you automate tiny donations that add up over time.
          Connect an account, pick causes, and set a cadence. We’ll handle the rest.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/nonprofits"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Browse nonprofits
          </Link>
          <Link
            href="/donate"
            className="inline-flex items-center rounded-lg border px-4 py-2"
          >
            Make a quick donation
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center rounded-lg border px-4 py-2"
          >
            Complete profile
          </Link>

          <div className="ms-auto">
            <SignOutButton />
          </div>
        </div>
      </section>

      {/* Quick Start checklist */}
      <section className="rounded-2xl border p-6">
        <h2 className="text-lg font-semibold">Quick start</h2>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
          <li>
            <span className="font-medium">Pick your causes:</span>{" "}
            choose 1–3 nonprofits you care about.
            <Link href="/nonprofits" className="ms-2 text-blue-600 underline">
              Choose now
            </Link>
          </li>
          <li>
            <span className="font-medium">Set a cadence:</span>{" "}
            daily penny, weekly $0.25, or monthly $1—whatever fits.
            <Link href="/settings/donations" className="ms-2 text-blue-600 underline">
              Configure
            </Link>
          </li>
          <li>
            <span className="font-medium">Connect payments (MVP):</span>{" "}
            Stripe for fiat (crypto later).
            <Link href="/settings/payments" className="ms-2 text-blue-600 underline">
              Connect
            </Link>
          </li>
        </ol>
      </section>

      {/* Two-up: Recent donations & Suggested nonprofits */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Recent donations (placeholder) */}
        <div className="rounded-2xl border p-6">
          <h3 className="text-lg font-semibold">Recent donations</h3>
          <p className="mt-2 text-sm text-gray-600">
            You don’t have any donations yet.
          </p>
          <Link
            href="/donate"
            className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-white"
          >
            Donate your first penny
          </Link>
          {/* TODO: replace with server data:
              - Query last 10 donations for session.user.id
              - Show date, amount, recipient */}
        </div>

        {/* Suggested nonprofits (placeholder) */}
        <div className="rounded-2xl border p-6">
          <h3 className="text-lg font-semibold">Suggested nonprofits</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">GiveDirectly</div>
                <div className="text-gray-600">Direct cash transfers</div>
              </div>
              <Link href="/nonprofits/givedirectly" className="text-blue-600 underline">
                View
              </Link>
            </li>
            <li className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Against Malaria Foundation</div>
                <div className="text-gray-600">Bed nets, proven impact</div>
              </div>
              <Link href="/nonprofits/amf" className="text-blue-600 underline">
                View
              </Link>
            </li>
            <li className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">GiveWell</div>
                <div className="text-gray-600">High-impact recommendations</div>
              </div>
              <Link href="/nonprofits/givewell" className="text-blue-600 underline">
                View
              </Link>
            </li>
          </ul>
          {/* TODO: replace with real list from DB */}
        </div>
      </section>

      {/* What’s new / Roadmap */}
      <section className="rounded-2xl border p-6">
        <h3 className="text-lg font-semibold">What’s new</h3>
        <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-gray-700">
          <li>Google sign-in is live ✅</li>
          <li>Email/password sign-up available ✅</li>
          <li>Next up: connect payments (Stripe) and crypto wallets</li>
        </ul>
      </section>
    </main>
  );
}
