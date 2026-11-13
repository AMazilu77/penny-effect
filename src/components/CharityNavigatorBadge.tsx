// A small Charity Navigator rating badge (D-016). Shows CN's score exactly as
// published, the stars as text, when we last checked, and links to the
// organization's CN profile (CN's attribution rules: cite them, link to them).
// Stars are written out as text; CN asks third parties showing stars as
// images to use their official star images, which we don't ship yet.
import { CN_EXPLAINER, CN_LABEL, displayRating, type CnRating } from "@/lib/charity-navigator/rating";

const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export function CharityNavigatorBadge({ rating, now, detailed = false }: { rating: CnRating; now: Date; detailed?: boolean }) {
  const r = displayRating(rating, now);
  if (!r) return null;
  return (
    <div className="space-y-1 text-sm">
      <a
        href={r.profileUrl}
        target="_blank"
        rel="noopener"
        title={CN_EXPLAINER}
        className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-control border bg-inset px-2.5 py-1 hover:border-primary"
      >
        <span className="font-semibold text-heading">
          {CN_LABEL}: {r.score}/100
        </span>
        {r.stars !== null && (
          <span className="text-fg">
            {r.stars} {r.stars === 1 ? "star" : "stars"} of 4
          </span>
        )}
        <span className={r.stale ? "font-semibold text-warn" : "text-muted"}>
          checked {monthYear.format(r.checkedAt)}
          {r.stale && " (may be out of date)"}
        </span>
      </a>
      {detailed && <p className="text-muted">{CN_EXPLAINER}</p>}
    </div>
  );
}
