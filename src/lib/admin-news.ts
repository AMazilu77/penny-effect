// Rules for admin news posting (Milestone 2). Every news item must link to
// where the organization actually published it (NewsItem.sourceUrl); the feed
// shows nothing without one. Pure, so it can be unit-tested.
import { z } from "zod";
import { safeExternalUrl } from "@/lib/feed";
import { newsImageErrors } from "@/lib/news-image";

/** Length limits, shown in the form and in error messages. */
export const NEWS_LIMITS = {
  title: { min: 3, max: 200 },
  content: { min: 10, max: 2000 },
  sourceUrl: { max: 2000 },
} as const;

export type NewsField = "organizationId" | "title" | "content" | "sourceUrl" | "imageUrl" | "imageAlt";

/** What admins see as each field's name. */
export const NEWS_FIELD_LABELS: Record<NewsField, string> = {
  organizationId: "Organization",
  title: "Title",
  content: "Summary",
  sourceUrl: "Source link",
  imageUrl: "Image link",
  imageAlt: "Image description",
};

/**
 * Text as the admin sees it: line breaks as one character, no outer spaces.
 * Browsers submit a textarea's line breaks as "\r\n" (two characters), so
 * without this a summary that fits the counter could be rejected as too long.
 */
export function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

/** The length the admin sees (what the live counter shows). */
export function visibleLength(value: string): number {
  return normalizeText(value).length;
}

const text = (min: number, max: number) => z.string().transform(normalizeText).pipe(z.string().min(min).max(max));

export const newsForm = z.object({
  organizationId: z.string().trim().min(1).max(64),
  title: text(NEWS_LIMITS.title.min, NEWS_LIMITS.title.max),
  content: text(NEWS_LIMITS.content.min, NEWS_LIMITS.content.max),
  sourceUrl: z
    .string()
    .trim()
    .max(NEWS_LIMITS.sourceUrl.max)
    .transform((value, ctx) => {
      const url = safeExternalUrl(value);
      if (!url) {
        ctx.addIssue({ code: "custom", message: "Source must be an http(s) link" });
        return z.NEVER;
      }
      return url;
    }),
  // Optional image (both empty = no image); rules in newsImageErrors.
  imageUrl: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
  imageAlt: z
    .string()
    .optional()
    .transform((v) => (v ? normalizeText(v) : "") || null),
})
  .superRefine((v, ctx) => {
    const problems = newsImageErrors({ imageUrl: v.imageUrl ?? "", imageAlt: v.imageAlt ?? "" });
    for (const [path, message] of Object.entries(problems)) ctx.addIssue({ code: "custom", path: [path], message });
  });

export type NewsInput = z.infer<typeof newsForm>;
export type NewsFormValues = Record<NewsField, string>;
/** What the older tests and callers pass: the image fields are optional. */
export type NewsFormInput = Omit<NewsFormValues, "imageUrl" | "imageAlt"> & Partial<Pick<NewsFormValues, "imageUrl" | "imageAlt">>;
export type NewsFieldErrors = Partial<Record<NewsField, string>>;

const n = (x: number) => x.toLocaleString("en-US");

/**
 * One plain-language message per field that failed, naming the rule and,
 * for length problems, the actual length. Computed from the values rather
 * than zod's messages so every message says exactly what to fix.
 */
export function newsFieldErrors(values: NewsFormInput): NewsFieldErrors {
  const errors: NewsFieldErrors = {};
  if (!values.organizationId.trim()) errors.organizationId = "Organization: choose one from the list.";

  for (const field of ["title", "content"] as const) {
    const { min, max } = NEWS_LIMITS[field];
    const length = visibleLength(values[field]);
    const label = NEWS_FIELD_LABELS[field];
    if (length === 0) errors[field] = `${label} is empty: write at least ${n(min)} characters.`;
    else if (length < min) errors[field] = `${label} is too short: ${n(length)} characters (minimum ${n(min)}).`;
    else if (length > max)
      errors[field] = `${label} is too long: ${n(length)} characters (maximum ${n(max)}). Shorten it by ${n(length - max)}.`;
  }

  const source = values.sourceUrl.trim();
  if (!source) errors.sourceUrl = "Source link is empty: paste the page where the organization published this.";
  else if (source.length > NEWS_LIMITS.sourceUrl.max)
    errors.sourceUrl = `Source link is too long: ${n(source.length)} characters (maximum ${n(NEWS_LIMITS.sourceUrl.max)}).`;
  else if (!safeExternalUrl(source))
    errors.sourceUrl = "Source link must be a full web address starting with https:// (or http://).";

  Object.assign(errors, newsImageErrors({ imageUrl: values.imageUrl ?? "", imageAlt: values.imageAlt ?? "" }));
  return errors;
}

/** Admins may post news only for organizations users can see (active and verified). */
export function canPostNewsFor(org: { status: "ACTIVE" | "HIDDEN"; verifiedAt: Date | null }): boolean {
  return org.status === "ACTIVE" && org.verifiedAt !== null;
}
