"use server";
// Server Actions for admin news posting. Same pattern as the organization
// actions: database role check, zod validation, ?notice=/?error= codes.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import {
  canPostNewsFor,
  newsFieldErrors,
  newsForm,
  normalizeText,
  type NewsFieldErrors,
  type NewsFormValues,
} from "@/lib/admin-news";
import { safeExternalUrl } from "@/lib/feed";
import { newsImageErrors, parseOgImage } from "@/lib/news-image";
import { safeFetch } from "@/lib/safe-fetch";
import { ERRORS, formDataToObject, type ErrorCode, type NoticeCode } from "@/lib/admin-orgs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PAGE = "/admin/news";

function done(notice: NoticeCode): never {
  revalidatePath("/admin", "layout");
  revalidatePath("/feed");
  redirect(`${PAGE}?notice=${notice}`);
}

function fail(error: ErrorCode): never {
  redirect(`${PAGE}?error=${error}`);
}

export type NewsFormState = {
  values: NewsFormValues;
  errors: NewsFieldErrors;
  /** Increases on every failed attempt, so the form re-renders with the kept values. */
  attempt: number;
};

const EMPTY: NewsFormValues = { organizationId: "", title: "", content: "", sourceUrl: "", imageUrl: "", imageAlt: "" };

/**
 * Posts a news item. The source link is required: no source, no news.
 * Used with React's useActionState: on a problem it returns the admin's
 * input and one message per field, so nothing typed is lost.
 */
export async function postNews(previous: NewsFormState | undefined, formData: FormData): Promise<NewsFormState> {
  await requireAdminPage();
  const values: NewsFormValues = { ...EMPTY };
  for (const key of Object.keys(EMPTY) as (keyof NewsFormValues)[]) {
    const v = formData.get(key);
    values[key] = typeof v === "string" ? v : "";
  }
  const attempt = (previous?.attempt ?? 0) + 1;

  const errors = newsFieldErrors(values);
  const input = newsForm.safeParse(values);
  if (Object.keys(errors).length > 0 || !input.success) {
    // newsFieldErrors covers every rule in newsForm; the fallback is defensive.
    return { values, attempt, errors: Object.keys(errors).length > 0 ? errors : { title: ERRORS["news-invalid"] } };
  }
  const { organizationId, title, content, sourceUrl, imageUrl, imageAlt } = input.data;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true, verifiedAt: true },
  });
  if (!org || !canPostNewsFor(org)) return { values, attempt, errors: { organizationId: ERRORS["news-org"] } };

  await prisma.newsItem.create({ data: { organizationId, title, content, sourceUrl, imageUrl, imageAlt } });
  done("news-posted");
}

/**
 * Reads the source page's preview image (og:image) so the admin doesn't have
 * to find it by hand. Admin-only; fetched with the SSRF rules in safe-fetch.ts.
 * Returns the image's URL, or a plain-language reason.
 */
export async function fetchPreviewImage(sourceUrl: string): Promise<{ imageUrl: string } | { error: string }> {
  await requireAdminPage();
  const url = safeExternalUrl(sourceUrl.trim());
  if (!url) return { error: "Enter the source link first (starting with https://)." };
  try {
    const page = await safeFetch(url, { maxBytes: 512 * 1024, accept: ["text/html", "application/xhtml+xml"], timeoutMs: 5000 });
    const imageUrl = parseOgImage(page.body.toString("utf8"), page.url);
    return imageUrl
      ? { imageUrl }
      : { error: "That page doesn't name a preview image. Paste an image link yourself, or post without one." };
  } catch {
    return { error: "Couldn't read that page (it may block automated visits). Paste an image link yourself, or post without one." };
  }
}

/** Replaces or removes an existing news item's image. */
export async function updateNewsImage(formData: FormData) {
  await requireAdminPage();
  const raw = formDataToObject(formData);
  const id = z.string().trim().min(1).max(64).safeParse(raw.newsItemId);
  if (!id.success) fail("news-invalid");
  const remove = raw.intent === "remove";
  const imageUrl = remove ? "" : String(raw.imageUrl ?? "");
  const imageAlt = remove ? "" : String(raw.imageAlt ?? "");
  if (!remove && !imageUrl.trim()) fail("news-image-invalid");
  if (Object.keys(newsImageErrors({ imageUrl, imageAlt })).length > 0) fail("news-image-invalid");
  const updated = await prisma.newsItem.updateMany({
    where: { id: id.data, sourceUrl: { not: null } },
    data: remove ? { imageUrl: null, imageAlt: null } : { imageUrl: imageUrl.trim(), imageAlt: normalizeText(imageAlt) },
  });
  if (updated.count === 0) fail("news-not-found");
  done(remove ? "news-image-removed" : "news-image-saved");
}

/** Removes a news item, e.g. one posted by mistake. */
export async function removeNews(formData: FormData) {
  await requireAdminPage();
  const input = z.object({ newsItemId: z.string().trim().min(1).max(64) }).safeParse(formDataToObject(formData));
  if (!input.success) fail("news-invalid");
  // Only admin-posted items (they always have a source); the old seeded
  // placeholders are left for the Milestone 5 cleanup.
  const removed = await prisma.newsItem.deleteMany({ where: { id: input.data.newsItemId, sourceUrl: { not: null } } });
  if (removed.count === 0) fail("news-not-found");
  done("news-removed");
}
