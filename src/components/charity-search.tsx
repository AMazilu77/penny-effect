"use client";

import { useEffect, useMemo, useState } from "react";

type Charity = {
  ein: string;
  name: string;
  city?: string;
  state?: string;
  mission?: string;
  website?: string;
  rating?: number;
};

export default function CharitySearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  async function fetchCharities(query: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/charities?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as Charity[];
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    fetchCharities(q);
  }

  // load initial list once
  useEffect(() => {
    fetchCharities("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Search by name, city, mission..."
          className="w-full rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={!canSearch && touched}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          title={!canSearch && touched ? "Type at least 2 characters" : ""}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <ul className="space-y-3">
        {items.map((c) => (
          <li
            key={c.ein}
            className="rounded border p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-semibold">
                {c.name} <span className="opacity-60">({c.ein})</span>
              </h3>
              {typeof c.rating === "number" && (
                <span className="text-sm opacity-80">
                  Rating: {c.rating.toFixed(1)}
                </span>
              )}
            </div>
            <div className="text-sm opacity-80">
              {[c.city, c.state].filter(Boolean).join(", ")}
            </div>
            {c.mission && (
              <p className="mt-2 text-sm leading-relaxed">{c.mission}</p>
            )}
            {c.website && (
              <a
                className="mt-2 inline-block text-sm text-blue-600"
                href={c.website}
                target="_blank"
                rel="noreferrer"
              >
                Visit website →
              </a>
            )}
            <div className="mt-3">
              <button className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
                Donate
              </button>
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 && !loading && (
        <div className="text-sm opacity-70">No results.</div>
      )}
    </div>
  );
}
