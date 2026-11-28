"use client";
// While a gift waits for Every.org's confirmation, re-render the page from the
// server every few seconds (router.refresh re-runs the server component; it
// reads only our database). Stops after a few minutes so a tab left open
// doesn't poll forever. The page never decides anything itself: only the
// webhook changes the status.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const EVERY_MS = 5_000;
const MAX_TRIES = 36; // 3 minutes

export function RefreshWhilePending() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= MAX_TRIES) return;
    const timer = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, EVERY_MS);
    return () => clearTimeout(timer);
  }, [router, tries]);

  return (
    <p className="text-sm text-muted" role="status">
      {tries < MAX_TRIES
        ? "This page updates by itself when Every.org confirms."
        : "Still waiting. Bank payments can take days; your gift history updates when Every.org confirms."}
    </p>
  );
}
