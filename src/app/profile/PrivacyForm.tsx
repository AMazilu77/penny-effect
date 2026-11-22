"use client";
// "Show my name in collective totals", default anonymous (Milestone 3.5).
// Stored now; collective totals (Milestone 4) will read it. Amounts are never
// shown next to a name either way (charter §6).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonPrimary } from "@/components/ui/buttons";
import { ResultMessage, sendJson, useSubmitState } from "./form-kit";

const OPTIONS = [
  { value: false, label: "Anonymous", help: "Your gifts count toward totals, but your name never appears. (Default)" },
  { value: true, label: "Show my name", help: "Your display name may appear among a cause's givers, never with an amount." },
] as const;

export function PrivacyForm({ showNameInTotals }: { showNameInTotals: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(showNameInTotals);
  const { busy, setBusy, result, setResult } = useSubmitState();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const outcome = await sendJson("/api/profile", "PATCH", { showNameInTotals: value }, "Saved.");
    setResult(outcome);
    setBusy(false);
    if (outcome.kind === "ok") router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-heading">In collective totals (&ldquo;everyone&rsquo;s pennies&rdquo;)</legend>
        {OPTIONS.map((option) => (
          <label
            key={String(option.value)}
            className={`flex cursor-pointer items-start gap-3 rounded-control border p-3 ${
              value === option.value ? "border-primary bg-accent-soft" : "bg-inset"
            }`}
          >
            <input
              type="radio"
              name="showNameInTotals"
              checked={value === option.value}
              onChange={() => setValue(option.value)}
              className="mt-1 h-4 w-4 accent-(--primary)"
            />
            <span>
              <span className="block font-semibold text-heading">{option.label}</span>
              <span className="block text-sm text-muted">{option.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <button
          type="submit"
          disabled={busy || value === showNameInTotals}
          aria-busy={busy}
          className={`${buttonPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      <ResultMessage result={result} />
    </form>
  );
}
