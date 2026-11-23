"use server";
// Server Actions for /admin/regions (D-028). Like every admin action, each
// one checks the admin role in the database first (requireAdminPage), then
// validates its input with zod, and reports back with a ?notice= or ?error=
// code (never echoing input).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { formDataToObject, type ErrorCode, type NoticeCode } from "@/lib/admin-orgs";
import { createRegionForm, regionIdForm, saveRegionForm } from "@/lib/regions";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE = "/admin/regions";

function done(notice: NoticeCode): never {
  revalidatePath(PAGE);
  revalidatePath("/discover");
  redirect(`${PAGE}?notice=${notice}`);
}

function fail(error: ErrorCode): never {
  redirect(`${PAGE}?error=${error}`);
}

const isUniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export async function createRegion(formData: FormData) {
  await requireAdminPage();
  const input = createRegionForm.safeParse(formDataToObject(formData));
  if (!input.success) fail("region-invalid");
  const { name, slug, counties } = input.data;
  try {
    await prisma.region.create({ data: { name, slug, counties: { createMany: { data: counties } } } });
  } catch (error) {
    if (isUniqueViolation(error)) fail("region-taken");
    throw error;
  }
  done("region-created");
}

/** Renames a region and replaces its counties. Its web address (slug) stays the same. */
export async function saveRegion(formData: FormData) {
  await requireAdminPage();
  const input = saveRegionForm.safeParse(formDataToObject(formData));
  if (!input.success) fail("region-invalid");
  const { regionId, name, counties } = input.data;
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.region.updateMany({ where: { id: regionId }, data: { name } });
      if (updated.count === 0) throw new RegionGone();
      await tx.regionCounty.deleteMany({ where: { regionId } });
      await tx.regionCounty.createMany({ data: counties.map((c) => ({ ...c, regionId })) });
    });
  } catch (error) {
    if (error instanceof RegionGone) fail("region-not-found");
    if (isUniqueViolation(error)) fail("region-taken");
    throw error;
  }
  done("region-saved");
}

/** Deletes a region (needs the confirm box). Users who had it as My area are left with none. */
export async function deleteRegion(formData: FormData) {
  await requireAdminPage();
  const input = regionIdForm.safeParse(formDataToObject(formData));
  if (!input.success || formData.get("confirm") !== "on") fail("region-invalid");
  const deleted = await prisma.region.deleteMany({ where: { id: input.data.regionId } });
  if (deleted.count === 0) fail("region-not-found");
  revalidatePath("/feed");
  done("region-deleted");
}

class RegionGone extends Error {}
