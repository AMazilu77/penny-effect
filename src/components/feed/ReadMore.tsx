"use client";
// A news summary that starts short and expands in place. The server decides
// the preview (src/lib/feed.ts previewText), so nothing is measured in the
// browser and the first render matches the server's HTML.
import { useId, useState } from "react";

export function ReadMore({ preview, full }: { preview: string; full: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="space-y-1">
      <p id={id} className="whitespace-pre-line text-fg">
        {open ? full : preview}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="text-sm font-medium text-link underline"
      >
        {open ? "Show less" : "Read more"}
      </button>
    </div>
  );
}
