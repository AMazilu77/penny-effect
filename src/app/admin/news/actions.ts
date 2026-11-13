"use server";
// Server Actions for admin news posting. Same pattern as the organization
// actions: database role check, zod validation, ?notice=/?error= codes.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { canPostNewsFor, newsFieldErrors, newsForm, type NewsFieldErrors, type NewsFormValues } from "@/lib/admin-news";
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

const EMPTY: NewsFormValues = { organizationId: "", title: "", content: "", sourceUrl: "" };

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
  const { organizationId, title, content, sourceUrl } = input.data;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true, verifiedAt: true },
  });
  if (!org || !canPostNewsFor(org)) return { values, attempt, errors: { organizationId: ERRORS["news-org"] } };

  await prisma.newsItem.create({ data: { organizationId, title, content, sourceUrl } });
  done("news-posted");
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
