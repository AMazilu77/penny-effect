"use client";
// Display name and short bio, with a live character count for the bio.
// The bio is plain text: shown exactly as typed (React escapes it), never as
// HTML or markdown.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BIO_MAX, NAME_MAX, charCount } from "@/lib/profile";
import { buttonPrimary } from "@/components/ui/buttons";
import { ResultMessage, field, labelText, sendJson, useSubmitState } from "./form-kit";

export function DetailsForm({ name: initialName, bio: initialBio }: { name: string; bio: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const { busy, setBusy, result, setResult } = useSubmitState();

  const bioCount = charCount(bio.trim());
  const nameCount = charCount(name.trim());
  const bioOver = bioCount > BIO_MAX;
  const nameInvalid = nameCount === 0 || nameCount > NAME_MAX;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const outcome = await sendJson("/api/profile", "PATCH", { name, bio }, "Saved.");
    setResult(outcome);
    setBusy(false);
    if (outcome.kind === "ok") router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="space-y-1">
        <span className={labelText}>Display name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          aria-invalid={nameInvalid}
          aria-describedby="name-help"
          className={field}
        />
        <span id="name-help" className="block text-sm text-muted">
          Up to {NAME_MAX} characters.
        </span>
      </label>

      <label className="space-y-1">
        <span className={labelText}>Short bio (optional)</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          aria-invalid={bioOver}
          aria-describedby="bio-count bio-help"
          className={field}
        />
        <span className="flex flex-wrap justify-between gap-2 text-sm">
          <span id="bio-help" className="text-muted">
            Plain text. Why you give, or the causes you care about.
          </span>
          <span id="bio-count" className={bioOver ? "font-semibold text-danger" : "text-muted"}>
            {bioCount} / {BIO_MAX}
            {bioOver && ` (${bioCount - BIO_MAX} too many)`}
          </span>
        </span>
      </label>

      <div>
        <button
          type="submit"
          disabled={busy || bioOver || nameInvalid}
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
