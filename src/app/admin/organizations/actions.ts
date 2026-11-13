"use server";
// Server Actions for the admin organization tools. A Server Action is a
// server function that a <form action={...}> calls directly, so these pages
// need almost no client-side JavaScript. Each action is still a public POST
// endpoint under the hood, so every one of them:
//   1. checks the admin role in the database (requireAdminPage),
//   2. validates its input with zod,
//   3. reports back by redirecting with a ?notice= or ?error= code that the
//      page turns into a fixed message (never echoing user input).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import {
  categoriesForm,
  everyOrgFields,
  everyOrgRefForm,
  formDataToObject,
  importForm,
  linkClearsVerification,
  orgIdForm,
  verifyBlocker,
  type ErrorCode,
  type NoticeCode,
} from "@/lib/admin-orgs";
import { suggestCategorySlugs } from "@/lib/causes";
import { createEveryOrgClient, EveryOrgError, type EveryOrgNonprofit } from "@/lib/everyorg/client";
import { normalizeEin } from "@/lib/everyorg/parse";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const LIST = "/admin/organizations";
const orgPath = (id: string) => `${LIST}/${encodeURIComponent(id)}`;

function done(path: string, notice: NoticeCode): never {
  revalidatePath("/admin", "layout");
  redirect(`${path}?notice=${notice}`);
}

function fail(path: string, error: ErrorCode): never {
  redirect(`${path}?error=${error}`);
}

/** Every.org details, or an error code. Never throws for Every.org problems. */
async function fetchFromEveryOrg(ref: string): Promise<EveryOrgNonprofit | ErrorCode> {
  // A 9-digit EIN may be typed with a dash; Every.org wants plain digits.
  const lookup = normalizeEin(ref) ?? ref;
  try {
    return (await createEveryOrgClient().getNonprofit(lookup)) ?? "everyorg-not-found";
  } catch (error) {
    if (error instanceof EveryOrgError) return "everyorg-failed";
    throw error;
  }
}

/**
 * A unique-constraint violation (P2002) on EIN, Every.org id/slug or name,
 * e.g. when two admins act at once. The common cases are checked up front
 * with clearer messages; this is the fallback.
 */
function uniqueViolation(error: unknown): ErrorCode | null {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? "ein-taken" : null;
}

/** Imports one nonprofit from Every.org as a new, unverified organization. */
export async function importOrganization(formData: FormData) {
  await requireAdminPage();
  const input = importForm.safeParse(formDataToObject(formData));
  if (!input.success) fail(`${LIST}/import`, "invalid");

  const np = await fetchFromEveryOrg(input.data.everyOrgSlug);
  if (typeof np === "string") fail(`${LIST}/import`, np);

  const existing = await prisma.organization.findFirst({
    where: {
      OR: [{ everyOrgId: np.everyOrgId }, { everyOrgSlug: np.slug }, ...(np.ein ? [{ ein: np.ein }] : [])],
    },
    select: { id: true },
  });
  if (existing) fail(orgPath(existing.id), "already-imported");
  // findFirst, not findUnique: the unique constraint on name is being dropped (the EIN is the identity).
  const sameName = await prisma.organization.findFirst({ where: { name: np.name }, select: { id: true } });
  if (sameName) fail(orgPath(sameName.id), "name-taken");

  // Suggested categories from Every.org causes (never Highest Impact).
  const slugs = suggestCategorySlugs(np.causes);
  const categories = await prisma.causeCategory.findMany({ where: { slug: { in: slugs } }, select: { id: true } });

  let createdId: string;
  try {
    const created = await prisma.organization.create({
      data: {
        name: np.name,
        ...everyOrgFields(np, new Date()),
        categories: { connect: categories },
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (error) {
    const code = uniqueViolation(error);
    if (code) fail(`${LIST}/import`, code);
    throw error;
  }
  done(orgPath(createdId), "imported");
}

/**
 * Links an existing organization to an Every.org record (by slug, EIN or id),
 * or refreshes it from the record it's already linked to.
 */
export async function linkOrganization(formData: FormData) {
  await requireAdminPage();
  const input = everyOrgRefForm.safeParse(formDataToObject(formData));
  if (!input.success) {
    const id = formData.get("organizationId");
    fail(typeof id === "string" && id ? orgPath(id) : LIST, "invalid");
  }
  const { organizationId, everyOrgRef } = input.data;
  const path = orgPath(organizationId);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { ein: true, verifiedAt: true },
  });
  if (!org) fail(LIST, "not-found");

  const np = await fetchFromEveryOrg(everyOrgRef);
  if (typeof np === "string") fail(path, np);

  const clearVerification = org.verifiedAt !== null && linkClearsVerification(org.ein, np.ein);
  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...everyOrgFields(np, new Date()),
        ...(clearVerification ? { verifiedAt: null, verifiedById: null } : {}),
      },
    });
  } catch (error) {
    const code = uniqueViolation(error);
    if (code) fail(path, code);
    throw error;
  }
  done(path, clearVerification ? "linked-unverified" : "linked");
}

/** Marks an organization as reviewed by this admin, if it meets the rules. */
export async function verifyOrganization(formData: FormData) {
  const { userId } = await requireAdminPage();
  const input = orgIdForm.safeParse(formDataToObject(formData));
  if (!input.success) fail(LIST, "invalid");
  const path = orgPath(input.data.organizationId);

  const org = await prisma.organization.findUnique({
    where: { id: input.data.organizationId },
    select: { ein: true, everyOrgId: true, isDisbursable: true, status: true },
  });
  if (!org) fail(LIST, "not-found");
  const blocker = verifyBlocker(org);
  if (blocker) fail(path, blocker);

  await prisma.organization.update({
    where: { id: input.data.organizationId },
    data: { verifiedAt: new Date(), verifiedById: userId },
  });
  done(path, "verified");
}

export async function unverifyOrganization(formData: FormData) {
  await requireAdminPage();
  const input = orgIdForm.safeParse(formDataToObject(formData));
  if (!input.success) fail(LIST, "invalid");
  const updated = await prisma.organization.updateMany({
    where: { id: input.data.organizationId },
    data: { verifiedAt: null, verifiedById: null },
  });
  if (updated.count === 0) fail(LIST, "not-found");
  done(orgPath(input.data.organizationId), "unverified");
}

async function setStatus(formData: FormData, status: "ACTIVE" | "HIDDEN") {
  await requireAdminPage();
  const input = orgIdForm.safeParse(formDataToObject(formData));
  if (!input.success) fail(LIST, "invalid");
  const updated = await prisma.organization.updateMany({
    where: { id: input.data.organizationId },
    data: { status },
  });
  if (updated.count === 0) fail(LIST, "not-found");
  done(orgPath(input.data.organizationId), status === "HIDDEN" ? "hidden" : "shown");
}

/** Hides an organization from users. Never deletes: donation history stays intact. */
export async function hideOrganization(formData: FormData) {
  await setStatus(formData, "HIDDEN");
}

export async function showOrganization(formData: FormData) {
  await setStatus(formData, "ACTIVE");
}

/** Replaces the organization's categories (including Highest Impact). */
export async function saveCategories(formData: FormData) {
  await requireAdminPage();
  const input = categoriesForm.safeParse(formDataToObject(formData, ["categoryIds"]));
  if (!input.success) fail(LIST, "invalid");
  const { organizationId, categoryIds } = input.data;

  // Only real categories; unknown ids are ignored rather than failing the save.
  const [org, valid] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
    prisma.causeCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true } }),
  ]);
  if (!org) fail(LIST, "not-found");
  await prisma.organization.update({
    where: { id: organizationId },
    data: { categories: { set: valid } },
  });
  done(orgPath(organizationId), "categories");
}
