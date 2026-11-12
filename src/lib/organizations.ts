// Which organizations regular users see (D-012). One definition, used by
// every user-facing query (donation form, donate API, feed, Discover).
// Admin pages see everything.
import type { Prisma } from "@/generated/prisma/client";

/**
 * Visible to users: ACTIVE, reviewed by an admin, has an EIN, and Every.org
 * can send it donations. Anything else is hidden (never deleted: past
 * donations still show in the donor's own history).
 */
export const VISIBLE_ORGANIZATION_WHERE = {
  status: "ACTIVE",
  verifiedAt: { not: null },
  ein: { not: null },
  isDisbursable: true,
} satisfies Prisma.OrganizationWhereInput;

/** The same rule for an organization already loaded. */
export function isVisibleOrganization(org: {
  status: "ACTIVE" | "HIDDEN";
  verifiedAt: Date | null;
  ein: string | null;
  isDisbursable: boolean;
}): boolean {
  return org.status === "ACTIVE" && org.verifiedAt !== null && org.ein !== null && org.isDisbursable;
}
