// Serving remote images through our own routes (/media/...). The database is
// the allowlist: a route looks up a stored URL by id and fetches only that,
// with the SSRF rules in safe-fetch.ts. Visitors' browsers never contact
// third-party hosts, and Next's image optimizer only ever sees our own
// /media paths (next.config.ts → images.localPatterns), so it can't be used
// as an open proxy.
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/news-image";
import { safeFetch } from "@/lib/safe-fetch";

const ONE_DAY = 60 * 60 * 24;

export function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
}

/** Fetches a stored image URL and returns it as our own response, or a 404. */
export async function serveStoredImage(url: string | null): Promise<Response> {
  if (!url) return notFound();
  try {
    const image = await safeFetch(url, { maxBytes: IMAGE_MAX_BYTES, accept: IMAGE_TYPES, timeoutMs: 8000 });
    return new Response(new Uint8Array(image.body), {
      headers: {
        "Content-Type": image.contentType,
        // Cached by browsers and Vercel's CDN; refreshed daily, so a changed
        // or removed image is re-checked (type, size) at least once a day.
        "Cache-Control": `public, max-age=${ONE_DAY}, s-maxage=${ONE_DAY}, stale-while-revalidate=${7 * ONE_DAY}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    // Never pass on the remote host's error details.
    return notFound();
  }
}
