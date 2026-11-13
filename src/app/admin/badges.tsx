// Status labels for the admin organization pages, in plain language
// (meanings in src/lib/org-status.ts).
import { orgStatuses, STATUS_GUIDE, type StatusKey, type StatusTone } from "@/lib/org-status";

const TONES: Record<StatusTone, string> = {
  good: "border-success bg-success-soft text-success",
  warn: "border-warn bg-warn-soft text-warn",
  muted: "bg-inset text-muted",
};

function Badge({ status }: { status: StatusKey }) {
  const s = STATUS_GUIDE[status];
  return (
    <span title={s.meaning} className={`rounded-full border px-2 py-0.5 text-sm font-medium ${TONES[s.tone]}`}>
      {s.label}
    </span>
  );
}

type OrgFlags = Parameters<typeof orgStatuses>[0];

export function OrgBadges({ org }: { org: OrgFlags }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {orgStatuses(org).map((s) => (
        <Badge key={s} status={s} />
      ))}
    </span>
  );
}

/** "What this means" for the statuses that apply to one organization. */
export function OrgStatusExplained({ org }: { org: OrgFlags }) {
  return (
    <ul className="space-y-1 text-sm">
      {orgStatuses(org).map((s) => (
        <li key={s}>
          <span className="font-semibold text-heading">{STATUS_GUIDE[s].label}:</span> {STATUS_GUIDE[s].meaning}
        </li>
      ))}
    </ul>
  );
}

/** Every status and what it means, for the list page. */
export function StatusLegend() {
  return (
    <details className="rounded-card border bg-card p-(--space-card) shadow-sm">
      <summary className="cursor-pointer font-semibold text-heading">What the labels mean</summary>
      <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        {(Object.keys(STATUS_GUIDE) as StatusKey[]).map((key) => (
          <div key={key} className="contents">
            <dt>
              <Badge status={key} />
            </dt>
            <dd>{STATUS_GUIDE[key].meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
