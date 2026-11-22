"use client";
// Small shared pieces for the profile page's forms: sending JSON to our
// profile API and showing the result. Each section saves on its own.
import { useState } from "react";

export const field = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";
export const labelText = "text-sm font-semibold text-heading";

export type Result = { kind: "ok" | "error"; message: string } | null;

/** Sends a request and turns the answer into a message to show. Never throws. */
export async function send(url: string, init: RequestInit, okMessage: string): Promise<NonNullable<Result>> {
  try {
    const res = await fetch(url, init);
    if (res.ok) return { kind: "ok", message: okMessage };
    const data: unknown = await res.json().catch(() => null);
    const error = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
    return { kind: "error", message: error ?? "Something went wrong. Please try again." };
  } catch {
    return { kind: "error", message: "Network error. Please try again." };
  }
}

export function sendJson(url: string, method: "PATCH" | "PUT" | "POST" | "DELETE", body: unknown, okMessage: string) {
  return send(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, okMessage);
}

/** A form's busy flag and last result. */
export function useSubmitState() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  return { busy, setBusy, result, setResult };
}

/** The outcome of the last save: a polite status, or an alert for errors. */
export function ResultMessage({ result }: { result: Result }) {
  if (!result) return null;
  return result.kind === "ok" ? (
    <p role="status" className="rounded-control border border-success bg-success-soft p-3 text-sm font-medium text-success">
      {result.message}
    </p>
  ) : (
    <p role="alert" className="rounded-control border border-danger bg-danger-soft p-3 text-sm font-medium text-danger">
      {result.message}
    </p>
  );
}
