// News images (UI pass PR 6): pure rules, unit-tested.
// We store only the image's URL (never a copy of the file) and serve it
// through our own media route (src/app/media/...), which only serves URLs
// stored in our database.

/** Limits for the image's alt text. */
export const IMAGE_ALT = { min: 5, max: 200 } as const;
export const IMAGE_URL_MAX = 2000;

/** Image types the media route serves. Not SVG: an SVG can carry scripts. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** The value of each <meta> tag's attributes, e.g. { property: "og:image", content: "…" }. */
function metaTags(html: string): Record<string, string>[] {
  const head = html.slice(0, 200_000); // og tags live in <head>; don't scan huge pages
  const tags: Record<string, string>[] = [];
  for (const m of head.matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs: Record<string, string> = {};
    for (const a of m[1].matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs[a[1].toLowerCase()] = decodeEntities(a[3] ?? a[4] ?? a[5] ?? "");
    }
    tags.push(attrs);
  }
  return tags;
}

/**
 * The page's preview image (og:image, then og:image:secure_url, then
 * twitter:image), resolved against the page's URL. Only http(s) results.
 */
export function parseOgImage(html: string, pageUrl: string): string | null {
  const tags = metaTags(html);
  const find = (key: string) =>
    tags.find((t) => (t.property ?? t.name ?? "").toLowerCase() === key && t.content?.trim())?.content.trim();
  const raw = find("og:image") ?? find("og:image:secure_url") ?? find("og:image:url") ?? find("twitter:image");
  if (!raw) return null;
  try {
    const url = new URL(raw, pageUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** "https://www.seti.org/news/x" → "seti.org": the credit line's site name. */
export function sourceSite(sourceUrl: string): string | null {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type NewsImageInput = { imageUrl: string; imageAlt: string };

/** Problems with an image/alt pair, by field. Both empty means "no image". */
export function newsImageErrors({ imageUrl, imageAlt }: NewsImageInput): { imageUrl?: string; imageAlt?: string } {
  const url = imageUrl.trim();
  const alt = imageAlt.trim();
  const errors: { imageUrl?: string; imageAlt?: string } = {};
  if (!url) {
    if (alt) errors.imageUrl = "Image: add an image link, or clear the description.";
    return errors;
  }
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:"))
    errors.imageUrl = "Image link must be a full web address starting with https://.";
  else if (url.length > IMAGE_URL_MAX) errors.imageUrl = `Image link is too long (maximum ${IMAGE_URL_MAX} characters).`;

  if (!alt) errors.imageAlt = "Image description is required: describe what the image shows, for people who can't see it.";
  else if (alt.length < IMAGE_ALT.min)
    errors.imageAlt = `Image description is too short: ${alt.length} characters (minimum ${IMAGE_ALT.min}).`;
  else if (alt.length > IMAGE_ALT.max)
    errors.imageAlt = `Image description is too long: ${alt.length} characters (maximum ${IMAGE_ALT.max}).`;
  return errors;
}
