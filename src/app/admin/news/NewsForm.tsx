"use client";
// The "Post an update" form. A Client Component only for two things: the
// live character count on the summary, and keeping what the admin typed
// when the server finds a problem (useActionState returns their values and
// one message per field).
import { useActionState, useState } from "react";
import { NEWS_LIMITS, visibleLength } from "@/lib/admin-news";
import { Field } from "../Field";
import { postNews, type NewsFormState } from "./actions";

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
