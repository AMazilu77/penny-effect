"use client";
// An image from our own /media routes, resized by Next's image optimizer,
// with the brand placeholder if it's missing or fails to load (the stored URL
// points at someone else's site and can break).
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function MediaImage({
  src,
  alt,
  sizes,
  className,
}: {
  /** A /media/... path, or null for the placeholder. */
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span aria-hidden className="lorenz-mark absolute inset-6 opacity-30" />;
  return <Image src={src} alt={alt} fill sizes={sizes} className={cn("object-cover", className)} onError={() => setFailed(true)} />;
}
