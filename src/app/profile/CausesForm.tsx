"use client";
// View and change the causes you follow. Same rule as onboarding: existing
// categories only, at least one (checked again by PUT /api/profile/causes).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonPrimary, chip } from "@/components/ui/buttons";
import { ResultMessage, sendJson, useSubmitState } from "./form-kit";

export type CauseOption = { id: string; name: string };

export function CausesForm({ categories, selected: initial }: { categories: readonly CauseOption[]; selected: readonly string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([...initial]);
  const { busy, setBusy, result, setResult } = useSubmitState();
  const unchanged = selected.length === initial.length && selected.every((id) => initial.includes(id));

  function toggle(id: string) {
    setResult(null);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const outcome = await sendJson("/api/profile/causes", "PUT", { categoryIds: selected }, "Causes saved. Your feed uses them under My causes.");
    setResult(outcome);
    setBusy(false);
    if (outcome.kind === "ok") router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2" aria-label="Causes">
        {categories.map((c) => {
          const on = selected.includes(c.id);
          return (
            <li key={c.id}>
              <button type="button" aria-pressed={on} onClick={() => toggle(c.id)} className={chip(on)}>
                {on && <span aria-hidden>✓&nbsp;</span>}
                {c.name}
              </button>
            </li>
          );
        })}
      </ul>
      {selected.length === 0 && <p className="text-sm text-muted">Pick at least one cause.</p>}
      <div>
        <button
          type="submit"
          disabled={busy || unchanged || selected.length === 0}
          aria-busy={busy}
          className={`${buttonPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {busy ? "Saving…" : "Save causes"}
        </button>
      </div>
      <ResultMessage result={result} />
    </form>
  );
}
