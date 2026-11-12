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
    good: "border-emerald-400/40 bg-emerald-500/10",
    warn: "border-amber-400/40 bg-amber-500/10",
    muted: "border-white/15 bg-white/5 opacity-70",
  };
  return <span className={`rounded-md border px-1.5 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
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
