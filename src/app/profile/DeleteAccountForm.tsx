"use client";
// Delete the account, after typing a confirmation (and the password, for
// accounts that have one). Then signs out. Gift records are kept for
// accounting but no longer linked to the person (src/lib/account-store.ts).
import { signOut } from "next-auth/react";
import { useState } from "react";
import { DELETE_CONFIRMATION } from "@/lib/account";
import { ResultMessage, field, labelText, sendJson, useSubmitState } from "./form-kit";

const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-control bg-danger px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const { busy, setBusy, result, setResult } = useSubmitState();
  const typed = confirmation.trim().toLowerCase() === DELETE_CONFIRMATION;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const body = hasPassword ? { confirmation, password } : { confirmation };
    const outcome = await sendJson("/api/profile", "DELETE", body, "Your account was deleted. Signing you out…");
    setResult(outcome);
    if (outcome.kind === "ok") {
      await signOut({ callbackUrl: "/" });
      return;
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Deleting your account removes your profile, picture, bio, causes, followed organizations and sign-in. It can&apos;t be undone.
      </p>
      <p className="text-sm text-muted">
        Records of your gifts are kept, because the money and receipts are real and the totals must still add up. They&apos;re
        anonymized: no name, email or message, and nothing links them to you any more.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={dangerButton}>
          Delete my account…
        </button>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-control border border-danger bg-danger-soft p-4">
          <label className="space-y-1">
            <span className={labelText}>
              Type <strong className="font-mono">{DELETE_CONFIRMATION}</strong> to confirm
            </span>
            <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" spellCheck={false} className={field} />
          </label>
          {hasPassword && (
            <label className="space-y-1">
              <span className={labelText}>Your password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !typed || (hasPassword && password.length === 0)} aria-busy={busy} className={dangerButton}>
              {busy ? "Deleting…" : "Delete my account permanently"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmation("");
                setPassword("");
                setResult(null);
              }}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-control border bg-card px-4 py-2 text-sm font-semibold text-fg hover:bg-inset"
            >
              Cancel
            </button>
          </div>
          <ResultMessage result={result} />
        </form>
      )}
    </div>
  );
}
