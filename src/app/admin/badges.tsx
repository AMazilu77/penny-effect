// Small status labels shared by the admin organization pages.
type OrgFlags = {
  status: "ACTIVE" | "HIDDEN";
  verifiedAt: Date | null;
  ein: string | null;
  everyOrgId: string | null;
  isDisbursable: boolean;
};

function Badge({ tone, children }: { tone: "good" | "warn" | "muted"; children: string }) {
  const tones = {
    good: "border-success bg-success-soft text-success",
    warn: "border-warn bg-warn-soft text-warn",
    muted: "bg-inset text-muted",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-sm font-medium ${tones[tone]}`}>{children}</span>;
}

export function OrgBadges({ org }: { org: OrgFlags }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {org.status === "HIDDEN" && <Badge tone="muted">Hidden</Badge>}
      {org.verifiedAt ? <Badge tone="good">Verified</Badge> : <Badge tone="warn">Unverified</Badge>}
      {!org.everyOrgId && <Badge tone="warn">Not on Every.org</Badge>}
      {org.everyOrgId && !org.ein && <Badge tone="warn">No EIN</Badge>}
      {org.everyOrgId && !org.isDisbursable && <Badge tone="warn">Not disbursable</Badge>}
    </span>
  );
}
