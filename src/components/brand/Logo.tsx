// The logo mark plus the "The Penny Effect" wordmark. The only place the
// logo file is used, so swapping it is one file (see src/lib/brand.ts).
import { BRAND_NAME, LOGO_SRC } from "@/lib/brand";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* Plain <img>: an SVG logo needs no resizing, and a PNG swap works the same. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="" width={size} height={size} className="shrink-0" style={{ height: size, width: "auto" }} />
      <span className="text-lg font-bold tracking-tight text-heading">{BRAND_NAME}</span>
    </span>
  );
}
