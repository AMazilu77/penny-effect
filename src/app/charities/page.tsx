import CharitySearch from "@/components/charity-search";

export default function CharitiesPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Find a Charity</h1>
      <p className="opacity-80">
        This page uses a client component to call our API route (mock data for now).
      </p>
      <CharitySearch />
    </main>
  );
}
