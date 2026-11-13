// Plain-language organization statuses for the admin pages. Admins are
// volunteers, not developers: every label says what it means for donors.
// Pure (no database), so it's unit-tested.
import { isVisibleOrganization } from "@/lib/organizations";

export type StatusKey = "live" | "verified" | "waiting" | "hidden" | "not-linked" | "no-ein" | "cant-receive";
export type StatusTone = "good" | "warn" | "muted";

export const STATUS_GUIDE: Record<StatusKey, { label: string; tone: StatusTone; meaning: string }> = {
  live: {
    label: "Live",
    tone: "good",
    meaning: "Donors see it on Discover and in the donation form: it's verified, active, has an EIN and can receive donations.",
  },
  verified: {
    label: "Verified",
    tone: "good",
    meaning: "An admin checked it. If it isn't also Live, something else (below) is keeping it from donors.",
  },
  waiting: {
    label: "Waiting for review",
    tone: "warn",
    meaning: "Imported but not verified yet. Donors don't see it until an admin works through the verification checklist.",
  },
  hidden: {
    label: "Hidden",
    tone: "muted",
    meaning: "Removed from the site by an admin. Nothing is deleted: donors' past gifts still show in their history.",
  },
  "not-linked": {
    label: "Not linked to Every.org",
    tone: "warn",
    meaning:
      "Not connected to its Every.org profile, so its details (EIN, whether it can receive gifts) aren't refreshed or re-checked. Link it on its page.",
  },
  "no-ein": {
    label: "No EIN",
    tone: "warn",
    meaning: "Every.org has no US tax ID (EIN) for it, so it can't be verified.",
  },
  "cant-receive": {
    label: "Can't receive donations",
    tone: "warn",
    meaning: "Every.org says it can't accept gifts right now. Donors don't see it until that changes.",
  },
};

type OrgFlags = {
  status: "ACTIVE" | "HIDDEN";
  verifiedAt: Date | null;
  ein: string | null;
  everyOrgId: string | null;
  isDisbursable: boolean;
};

/** The statuses that apply to an organization, most important first. */
export function orgStatuses(org: OrgFlags): StatusKey[] {
  const keys: StatusKey[] = [];
  if (isVisibleOrganization(org)) keys.push("live");
  else if (org.verifiedAt) keys.push("verified");
  if (org.status === "HIDDEN") keys.push("hidden");
  else if (!org.verifiedAt) keys.push("waiting");
  if (!org.everyOrgId) keys.push("not-linked");
  else {
    if (!org.ein) keys.push("no-ein");
    if (!org.isDisbursable) keys.push("cant-receive");
  }
  return keys;
}
