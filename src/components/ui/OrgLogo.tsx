"use client";
// An organization's logo, or a branded placeholder when there is none or it
// fails to load (stored logo URLs point at other sites and can break).
import { useState } from "react";
import { cn } from "@/lib/utils";

export function OrgLogo({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const base = cn("shrink-0 rounded-full border", className);
  if (!src || failed) return <span aria-hidden className={cn(base, "bg-accent-soft")} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- PROTOTYPE; the real PR loads logos through next/image
    <img src={src} alt="" onError={() => setFailed(true)} className={cn(base, "bg-white object-contain")} />
  );
}
