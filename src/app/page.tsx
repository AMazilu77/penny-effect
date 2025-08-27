import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Penny Effect (React MVP)</h1>
      <p className="opacity-80">Welcome.</p>

      <Link
        href="/charities"
        className="inline-block rounded bg-black px-4 py-2 text-white"
      >
        Browse Charities
      </Link>
    </main>
  );
}
