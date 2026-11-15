// Tabs on /admin/organizations: Needs review (default), Live, Hidden.
// Every organization is in exactly one tab:
//   - Hidden:       status HIDDEN (whatever else is true of it),
//   - Live:         what users see (VISIBLE_ORGANIZATION_WHERE),
//   - Needs review: ACTIVE but not yet visible to users.
// The tab and the search live in the URL (?tab=hidden&q=cancer) so they
// survive reloads and the redirect after Hide / Unhide.
import type { Prisma } from "@/generated/prisma/client";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";

export const ORG_TABS = ["review", "live", "hidden"] as const;
export type OrgTab = (typeof ORG_TABS)[number];

export const ORG_TAB_LABELS: Record<OrgTab, string> = {
  review: "Needs review",
  live: "Live",
  hidden: "Hidden",
};

export const DEFAULT_ORG_TAB: OrgTab = "review";

/** The tab from a query value; anything unknown falls back to Needs review. */
export function parseOrgTab(value: unknown): OrgTab {
  return typeof value === "string" && (ORG_TABS as readonly string[]).includes(value) ? (value as OrgTab) : DEFAULT_ORG_TAB;
}

/** The search text from a query value: trimmed, at most 100 characters. */
export function parseOrgSearch(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

export function orgTabWhere(tab: OrgTab): Prisma.OrganizationWhereInput {
  switch (tab) {
    case "hidden":
      return { status: "HIDDEN" };
    case "live":
      return VISIBLE_ORGANIZATION_WHERE;
    case "review":
      return { status: "ACTIVE", NOT: { AND: [VISIBLE_ORGANIZATION_WHERE] } };
  }
}

/** Matches the name (any case) or the EIN (dash optional). Empty search matches all. */
export function orgSearchWhere(q: string): Prisma.OrganizationWhereInput {
  if (!q) return {};
  const or: Prisma.OrganizationWhereInput[] = [{ name: { contains: q, mode: "insensitive" } }];
  const digits = q.replace(/-/g, "");
  if (/^\d+$/.test(digits)) or.push({ ein: { contains: digits } });
  return { OR: or };
}

/** Link to a tab, keeping the search. The default tab has no ?tab=. */
export function orgTabHref(tab: OrgTab, q = ""): string {
  const params = new URLSearchParams();
  if (tab !== DEFAULT_ORG_TAB) params.set("tab", tab);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/admin/organizations${query ? `?${query}` : ""}`;
}
