"use client";

import { buttonPrimary } from "@/components/ui/buttons";
import React, { useState, JSX } from "react";
import { useRouter } from "next/navigation";

export type CategoryOption = {
  id: string;
  name: string;
  description: string | null;
};

// Display-only icons, matched by category name. Unknown names get a default.
const EMOJI_BY_NAME: Record<string, string> = {
  "Humanitarian Aid": "🌍",
  "Animal Welfare": "🐘",
  Environment: "🌳",
  "Mental Health": "🧠",
  "Political Reform": "🏛️",
  "Medical Research": "💉",
  Education: "📚",
  "Space & Science": "🚀",
};

export function InterestsForm({ categories }: { categories: CategoryOption[] }): JSX.Element {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [progress] = useState(50);
  const [loading, setLoading] = useState(false);

  // Ticking "select all" selects every cause. Done in the event handler rather
  // than in a useEffect, so React renders once instead of twice.
  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) setSelected(categories.map((c) => c.id));
  };

  const toggleCause = (id: string) => {
    if (selectAll) setSelectAll(false);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // "Select all" already put every category id into `selected`.
        body: JSON.stringify({ categoryIds: selected }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("There was an error saving your interests.");
    } finally {
      setLoading(false);
    }
  };

  const canContinue = selected.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-(--space-section)">
      {/* Progress */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted">Step 2 of 2: choose your causes</div>
        <div
          className="h-2 w-full rounded-full border bg-inset"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Onboarding progress"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold">What causes move you?</h1>
        <p className="text-muted">Pick at least one. Your feed shows verified nonprofits and their real updates in these causes.</p>
      </header>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={selectAll}
          onChange={(e) => handleSelectAllChange(e.target.checked)}
          className="h-5 w-5 accent-(--primary)"
        />
        <span className="text-lg font-medium">I care about all causes</span>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cause) => {
          const on = selected.includes(cause.id);
          return (
            <button
              key={cause.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggleCause(cause.id)}
              className={`rounded-card border-2 p-(--space-card) text-left shadow-sm transition ${
                on ? "border-primary bg-accent-soft" : "border-line bg-card hover:bg-inset"
              }`}
            >
              <div aria-hidden className="mb-2 text-3xl">
                {EMOJI_BY_NAME[cause.name] ?? "✨"}
              </div>
              <div className="mb-1 text-lg font-semibold text-heading">{cause.name}</div>
              <p className="text-sm text-muted">{cause.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canContinue || loading}
          className={`${buttonPrimary} px-10 py-3 text-base disabled:cursor-not-allowed disabled:border disabled:border-dashed disabled:bg-inset disabled:text-muted`}
        >
          {loading ? "Saving…" : "Continue"}
        </button>
        <p className="text-sm text-muted">You can change your causes any time from your dashboard.</p>
      </div>
    </div>
  );
}
