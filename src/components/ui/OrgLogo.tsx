"use client";
// An organization's logo (served from /media/org/<id>/logo), or a branded
// placeholder when there is none or it fails to load.
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function OrgLogo({ orgId, hasLogo, size, className }: { orgId: string; hasLogo: boolean; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const base = cn("shrink-0 rounded-full border", className);
  if (!hasLogo || failed) return <span aria-hidden className={cn(base, "bg-accent-soft")} style={{ width: size, height: size }} />;
  return (
    <Image
      src={`/media/org/${orgId}/logo`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn(base, "bg-card object-contain")}
    />
  );
}
