"use client";
// The Give page's form: choose an amount, record a PENDING gift (POST
// /api/donate with checkout: true), then go to Every.org to pay.
// The server re-checks everything (amount, $10 minimum, organization).
import { useRef, useState } from "react";
import { buttonPrimary } from "@/components/ui/buttons";
import { formatCents, parseDollarsToCents } from "@/lib/money";

const PRESETS_CENTS = [1000, 2500, 5000, 10000];

export function GiveForm({
  organizationId,
  organizationName,
  minCents,
  maxCents,
}: {
  organizationId: string;
  organizationName: string;
  minCents: number;
  maxCents: number;
}) {
  const [preset, setPreset] = useState<number | "other">(2500);
  const [other, setOther] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Updated immediately (unlike state), so a second click in the same instant is ignored.
  const inFlight = useRef(false);
  // One key per gift: a retry or double-click can't record it twice (src/lib/record-donation.ts).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const cents = preset === "other" ? parseDollarsToCents(other) : preset;
  const amountProblem =
    cents === null
      ? "Enter an amount like 15 or 15.50."
      : cents < minCents
        ? `Every.org's minimum gift is ${formatCents(minCents)}.`
        : cents > maxCents
          ? `The maximum gift is ${formatCents(maxCents)}.`
          : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (amountProblem || cents === null) {
      setError(amountProblem ?? "Enter an amount.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, amount: (cents / 100).toFixed(2), idempotencyKey, checkout: true }),
      });
      const data: { checkoutUrl?: string; error?: string } = await res.json().catch(() => ({}));
      if (res.ok && data.checkoutUrl) {
        // Keep the button disabled: we're leaving for Every.org.
        window.location.assign(data.checkoutUrl);
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    inFlight.current = false;
    setBusy(false);
  }

  const option = (selected: boolean) =>
    `flex cursor-pointer items-center justify-center rounded-control border px-3 py-2 text-base font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
      selected ? "border-primary bg-accent-soft text-heading" : "bg-inset text-fg"
    }`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-heading">Amount (USD)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS_CENTS.map((value) => (
            <label key={value} className={option(preset === value)}>
              <input
                type="radio"
                name="amount"
                className="sr-only"
                checked={preset === value}
                onChange={() => setPreset(value)}
              />
              {formatCents(value).replace(".00", "")}
            </label>
          ))}
        </div>
        <label className={`${option(preset === "other")} justify-start gap-3`}>
          <input
            type="radio"
            name="amount"
            className="h-4 w-4 accent-(--primary)"
            checked={preset === "other"}
            onChange={() => setPreset("other")}
          />
          <span>Other amount</span>
        </label>
        {preset === "other" && (
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-heading">Your amount in dollars ($10 minimum)</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={other}
              onChange={(e) => setOther(e.target.value.trim())}
              placeholder="15.00"
              aria-invalid={Boolean(error)}
              className="w-full rounded-control border bg-inset px-3 py-2 text-base text-fg"
            />
          </label>
        )}
      </fieldset>

      <div className="space-y-2 rounded-control border bg-inset p-3 text-sm">
        <p>
          <strong className="text-heading">Donations are processed by Every.org.</strong> You pay on Every.org, they send the
          money to {organizationName}, and your tax receipt comes from Every.org by email. We never see your card or bank
          details.
        </p>
        <p className="text-muted">
          Every.org&apos;s processing fee depends on how you pay (cards: 2.2% + $0.30;{" "}
          <a href="https://www.every.org/pricing" target="_blank" rel="noopener noreferrer" className="text-link underline">
            their pricing
          </a>
          ). You can still change the amount on Every.org; we record what Every.org confirms.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className={`${buttonPrimary} py-3 text-base disabled:cursor-wait disabled:opacity-70`}
      >
        {busy ? "Taking you to Every.org…" : cents !== null && !amountProblem ? `Continue to Every.org to give ${formatCents(cents)}` : "Continue to Every.org"}
      </button>
      <p className="text-sm text-muted">
        Your gift counts as given once Every.org confirms the payment to us, usually within a few minutes.
      </p>
    </form>
  );
}
