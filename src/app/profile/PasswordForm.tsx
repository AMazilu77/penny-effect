"use client";
// Change password (accounts with a password only).
import { useState } from "react";
import { PASSWORD_MIN } from "@/lib/account";
import { buttonPrimary } from "@/components/ui/buttons";
import { ResultMessage, field, labelText, sendJson, useSubmitState } from "./form-kit";

export function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const { busy, setBusy, result, setResult } = useSubmitState();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const outcome = await sendJson(
      "/api/profile/password",
      "POST",
      { currentPassword, newPassword, confirmPassword },
      "Password changed. Use the new one next time you sign in.",
    );
    setResult(outcome);
    setBusy(false);
    if (outcome.kind === "ok") {
      setCurrent("");
      setNew("");
      setConfirm("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="space-y-1">
        <span className={labelText}>Current password</span>
        <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrent(e.target.value)} className={field} />
      </label>
      <label className="space-y-1">
        <span className={labelText}>New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          aria-describedby="new-password-help"
          className={field}
        />
        <span id="new-password-help" className="block text-sm text-muted">
          At least {PASSWORD_MIN} characters.
        </span>
      </label>
      <label className="space-y-1">
        <span className={labelText}>Confirm new password</span>
        <input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} className={field} />
      </label>
      <div>
        <button type="submit" disabled={busy} aria-busy={busy} className={`${buttonPrimary} disabled:cursor-wait disabled:opacity-60`}>
          {busy ? "Changing…" : "Change password"}
        </button>
      </div>
      <ResultMessage result={result} />
    </form>
  );
}
