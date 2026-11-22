// Small pieces shared by the Why give cards and the one-page version.
import type { ReactNode } from "react";
import Image from "next/image";
import { formatValue, type Series } from "@/lib/impact";
import { captionText, type CardImage } from "@/lib/why-give-cards";

/** A chart's values as table rows, newest first. */
export function rows(series: Series, format: "percent" | "rate" | "count"): [string, string][] {
  return [...series.points].reverse().map((p) => [String(p.year), formatValue(p.value, format)]);
}

export function Cite({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted underline">
      {children}
    </a>
  );
}

/**
 * A card's image slot. A real photo always shows its caption (what, where,
 * when), credit and licence (policy: D-027). A placeholder is a quiet,
 * decorative pattern; what we're looking for is shown only in development.
 */
export function CardImageSlot({ image }: { image: CardImage }) {
  if (image.kind === "placeholder") {
    return (
      <figure className="space-y-1">
        <div className="relative grid aspect-[3/2] place-items-center overflow-hidden rounded-control border bg-inset">
          <div aria-hidden="true" className="lorenz-mark absolute inset-6 opacity-15" />
          {process.env.NODE_ENV !== "production" && (
            <p className="relative max-w-sm px-6 text-center text-sm text-muted">
              <span className="font-semibold text-heading">Photo slot (dev only):</span> {image.wanted}
            </p>
          )}
        </div>
      </figure>
    );
  }
  return (
    <figure className="space-y-1">
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(min-width: 768px) 672px, 100vw"
        className="h-auto w-full rounded-control border"
      />
      <figcaption className="text-sm text-muted">
        {captionText(image)} Photo: {image.credit}.{" "}
        {image.licenseUrl ? (
          <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {image.license}
          </a>
        ) : (
          image.license
        )}
        .{" "}
        <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Source
        </a>
      </figcaption>
    </figure>
  );
}
