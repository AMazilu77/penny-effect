"use client";
// "My area" (local nonprofits, D-028): a region, or a city with its state,
// or none (the default). Coarse only: never a street address, and nothing
// is detected automatically. Used for the feed's Near me tab and
// Discover's "Use my area".
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buttonPrimary, buttonSecondary } from "@/components/ui/buttons";
import { ResultMessage, field, labelText, sendJson, useSubmitState } from "./form-kit";

type Choice = { kind: "none" } | { kind: "region"; regionSlug: string } | { kind: "city"; state: string; city: string };

export function AreaForm({
  regions,
  states,
  current,
}: {
  regions: { slug: string; name: string }[];
  states: { code: string; name: string }[];
  current: Choice;
}) {
  const router = useRouter();
  // The select holds "none", "city", or a region slug.
  const [mode, setMode] = useState(current.kind === "region" ? current.regionSlug : current.kind);
  const [state, setState] = useState(current.kind === "city" ? current.state : "");
  const [city, setCity] = useState(current.kind === "city" ? current.city : "");
  const { busy, setBusy, result, setResult } = useSubmitState();
  const id = useId();

  async function save(choice: Choice) {
    setBusy(true);
    setResult(null);
    const outcome = await sendJson("/api/profile/area", "PUT", choice, choice.kind === "none" ? "Area cleared." : "Saved.");
    setResult(outcome);
    setBusy(false);
    if (outcome.kind === "ok") router.refresh();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "none") void save({ kind: "none" });
    else if (mode === "city") void save({ kind: "city", state, city });
    else void save({ kind: "region", regionSlug: mode });
  }

  const cityIncomplete = mode === "city" && (!state || city.trim() === "");

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-1">
        <label htmlFor={`${id}-area`} className={`block ${labelText}`}>
          My area
        </label>
        <select id={`${id}-area`} value={mode} onChange={(e) => setMode(e.target.value)} className={field}>
          <option value="none">Not set</option>
          {regions.length > 0 && (
            <optgroup label="Regions">
              {regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          )}
          <option value="city">A city…</option>
        </select>
      </div>
      {mode === "city" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`${id}-city`} className={`block ${labelText}`}>
              City
            </label>
            <input
              id={`${id}-city`}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
              autoComplete="address-level2"
              className={field}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-state`} className={`block ${labelText}`}>
              State
            </label>
            <select id={`${id}-state`} value={state} onChange={(e) => setState(e.target.value)} className={field}>
              <option value="">Choose…</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <p className="text-sm text-muted">
        Only a region or a city, never your address. We don&apos;t detect where you are; this is only what you choose here.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || cityIncomplete}
          aria-busy={busy}
          className={`${buttonPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {current.kind !== "none" && (
          <button type="button" disabled={busy} onClick={() => void save({ kind: "none" })} className={buttonSecondary}>
            Clear
          </button>
        )}
      </div>
      <ResultMessage result={result} />
    </form>
  );
}
