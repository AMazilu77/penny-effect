"use client";
// Upload, replace or remove the profile picture. Quick checks here for fast
// feedback; the server checks again and does the real work (square crop,
// resize, re-encode) in POST /api/profile/avatar.
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from "@/lib/avatar";
import { buttonSecondary } from "@/components/ui/buttons";
import { ResultMessage, send, useSubmitState } from "./form-kit";

export function AvatarForm({ hasUpload, fallbackText }: { hasUpload: boolean; fallbackText: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const { busy, setBusy, result, setResult } = useSubmitState();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setResult({ kind: "error", message: "Use a JPEG, PNG or WebP picture." });
    } else if (file.size > AVATAR_MAX_BYTES) {
      setResult({ kind: "error", message: "That picture is over 2 MB. Choose a smaller one." });
    } else {
      setBusy(true);
      const form = new FormData();
      form.set("file", file);
      const outcome = await send("/api/profile/avatar", { method: "POST", body: form }, "Picture saved.");
      setResult(outcome);
      setBusy(false);
      if (outcome.kind === "ok") router.refresh();
    }
    // Lets the same file be chosen again after an error.
    if (input.current) input.current.value = "";
  }

  async function onRemove() {
    setBusy(true);
    setResult(null);
    const outcome = await send("/api/profile/avatar", { method: "DELETE" }, `Picture removed. Showing ${fallbackText} instead.`);
    setResult(outcome);
    setBusy(false);
    if (outcome.kind === "ok") router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* The real file input is visually hidden but still focusable through its label. */}
        <label className={`${buttonSecondary} cursor-pointer focus-within:outline-2 focus-within:outline-(--focus) ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <input
            ref={input}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="sr-only"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {busy ? "Working…" : hasUpload ? "Replace picture" : "Upload picture"}
        </label>
        {hasUpload && (
          <button type="button" onClick={onRemove} disabled={busy} className={`${buttonSecondary} disabled:opacity-60`}>
            Remove picture
          </button>
        )}
      </div>
      <p className="text-sm text-muted">JPEG, PNG or WebP, up to 2 MB. We crop it to a square from the centre.</p>
      <ResultMessage result={result} />
    </div>
  );
}
