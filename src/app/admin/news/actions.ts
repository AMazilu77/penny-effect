"use server";
// Server Actions for admin news posting. Same pattern as the organization
// actions: database role check, zod validation, ?notice=/?error= codes.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { canPostNewsFor, newsForm } from "@/lib/admin-news";
import { formDataToObject, type ErrorCode, type NoticeCode } from "@/lib/admin-orgs";
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

/** Posts a news item. The source link is required: no source, no news. */
export async function postNews(formData: FormData) {
  await requireAdminPage();
  const input = newsForm.safeParse(formDataToObject(formData));
  if (!input.success) fail("news-invalid");
  const { organizationId, title, content, sourceUrl } = input.data;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true, verifiedAt: true },
  });
  if (!org || !canPostNewsFor(org)) fail("news-org");

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
