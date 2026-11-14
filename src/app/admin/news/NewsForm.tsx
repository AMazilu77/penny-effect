"use client";
// The "Post an update" form. A Client Component only for two things: the
// live character count on the summary, and keeping what the admin typed
// when the server finds a problem (useActionState returns their values and
// one message per field).
import { useActionState, useState } from "react";
import { NEWS_LIMITS, visibleLength } from "@/lib/admin-news";
import { IMAGE_ALT } from "@/lib/news-image";
import { Field } from "../Field";
import { fetchPreviewImage, postNews, type NewsFormState } from "./actions";

const input = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg aria-[invalid=true]:border-danger";
const button =
  "inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset disabled:cursor-wait disabled:text-muted";

export function NewsForm({ orgs }: { orgs: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<NewsFormState | undefined, FormData>(postNews, undefined);
  const errors = state?.errors ?? {};
  const values = state?.values;
  const messages = Object.values(errors);

  return (
    // key: after a failed attempt, re-mount so the fields start from the values the admin sent.
    <form key={state?.attempt ?? 0} action={action} className="space-y-4" noValidate>
      {messages.length > 0 && (
        <div role="alert" className="rounded-control border border-danger bg-danger-soft p-3 text-sm text-danger">
          <p className="font-semibold">Not posted yet. Nothing you typed was lost; fix {messages.length === 1 ? "this" : "these"}:</p>
          <ul className="mt-1 list-disc ps-5">
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <Field
        id="organizationId"
        label="Organization"
        help="Only verified, active organizations are listed: news only appears for organizations donors can see."
        error={errors.organizationId}
      >
        <select name="organizationId" className={input} defaultValue={values?.organizationId ?? ""}>
          <option value="" disabled>
            Choose…
          </option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="title"
        label="Title"
        help={`Use the organization's own headline, or a plain, factual one. ${NEWS_LIMITS.title.min}–${NEWS_LIMITS.title.max} characters.`}
        error={errors.title}
      >
        <input name="title" defaultValue={values?.title ?? ""} className={input} />
      </Field>
      <SummaryField defaultValue={values?.content ?? ""} error={errors.content} />
      <Field
        id="sourceUrl"
        label="Source link"
        help="The exact page where the organization published this (their site, blog or press release), starting with https://. Readers get a “Read the original” button that opens it."
        error={errors.sourceUrl}
      >
        <input name="sourceUrl" type="url" placeholder="https://" defaultValue={values?.sourceUrl ?? ""} className={input} />
      </Field>
      <ImageFields
        defaultUrl={values?.imageUrl ?? ""}
        defaultAlt={values?.imageAlt ?? ""}
        urlError={errors.imageUrl}
        altError={errors.imageAlt}
      />
      <button className={button} disabled={pending}>
        {pending ? "Posting…" : "Post"}
      </button>
    </form>
  );
}

/** The summary, with a live count that turns red past the limit (it never silently cuts pasted text). */
function SummaryField({ defaultValue, error }: { defaultValue: string; error?: string }) {
  const [length, setLength] = useState(() => visibleLength(defaultValue));
  const { min, max } = NEWS_LIMITS.content;
  const over = length > max;
  return (
    <Field
      id="content"
      label="Summary"
      help={`Two or three sentences in your own words about what the organization published. Only include facts that are in the source. ${min}–${max.toLocaleString("en-US")} characters.`}
      error={error}
      extra={
        <p aria-live="polite" className={`shrink-0 text-sm tabular-nums ${over ? "font-semibold text-danger" : "text-muted"}`}>
          {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
          {over && ` (${(length - max).toLocaleString("en-US")} over)`}
        </p>
      }
    >
      <textarea
        name="content"
        rows={5}
        defaultValue={defaultValue}
        onChange={(e) => setLength(visibleLength(e.target.value))}
        className={input}
      />
    </Field>
  );
}

/**
 * Optional image: "Fetch from source" fills in the source page's preview
 * image (og:image); the admin can replace or clear it. Alt text is required
 * whenever there's an image.
 */
function ImageFields({
  defaultUrl,
  defaultAlt,
  urlError,
  altError,
}: {
  defaultUrl: string;
  defaultAlt: string;
  urlError?: string;
  altError?: string;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  async function fetchFromSource() {
    const source = (document.getElementById("sourceUrl") as HTMLInputElement | null)?.value ?? "";
    setFetching(true);
    setStatus(null);
    const result = await fetchPreviewImage(source);
    setFetching(false);
    if ("imageUrl" in result) {
      setUrl(result.imageUrl);
      setStatus("Found the page's preview image. Check it below, then describe it.");
    } else setStatus(result.error);
  }

  const preview = /^https?:\/\//.test(url.trim()) ? url.trim() : null;
  return (
    <fieldset className="space-y-3 rounded-control border bg-inset p-4">
      <legend className="px-1 text-sm font-semibold text-heading">Image (optional)</legend>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={fetchFromSource} disabled={fetching} className={button}>
          {fetching ? "Looking…" : "Fetch image from source"}
        </button>
        {status && (
          <p role="status" className="text-sm">
            {status}
          </p>
        )}
      </div>
      <Field
        id="imageUrl"
        label="Image link"
        help="Filled in by “Fetch image from source”, or paste the link of an image from the organization's own page. We store the link only, and show it with the credit “Image: <source site>”. Leave empty for no image."
        error={urlError}
      >
        <input name="imageUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={input} />
      </Field>
      {preview && (
        // Admin-only preview straight from the image's host (no referrer sent). Donors get it through /media.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" referrerPolicy="no-referrer" className="max-h-48 rounded-control border object-contain" />
      )}
      <Field
        id="imageAlt"
        label="Image description"
        help={`Required with an image: say what it shows, for people who can't see it (e.g. "Health workers unloading bed nets from a truck"). ${IMAGE_ALT.min}–${IMAGE_ALT.max} characters.`}
        error={altError}
      >
        <input name="imageAlt" defaultValue={defaultAlt} maxLength={IMAGE_ALT.max} className={input} />
      </Field>
    </fieldset>
  );
}
