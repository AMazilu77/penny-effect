// A user's picture: their uploaded photo or Google avatar when there is one,
// otherwise their initials on the brand's soft green. Decorative (alt=""):
// the name is always written next to it.
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({ src, initials, size, className }: { src: string | null; initials: string; size: number; className?: string }) {
  const base = cn("shrink-0 rounded-full border", className);
  if (!src) {
    return (
      <span
        aria-hidden
        className={cn(base, "inline-flex items-center justify-center bg-accent-soft font-bold text-heading")}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      >
        {initials}
      </span>
    );
  }
  return (
    // `unoptimized`: shown as-is. Our own avatar route already serves a small
    // square WebP, and a Google avatar URL must not go through Next's image
    // optimizer (no remote hosts are allowed there, see next.config.ts).
    // no-referrer: Google's avatar host can refuse requests that carry one.
    <Image src={src} alt="" width={size} height={size} unoptimized referrerPolicy="no-referrer" className={cn(base, "bg-card object-cover")} />
  );
}
