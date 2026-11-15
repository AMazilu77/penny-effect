// Follow / Following button for one organization (Local plan L1). A plain
// form posting to a Server Action, so it works without JavaScript. Signed-out
// visitors get a link to sign in that brings them back here.
import Link from "next/link";
import { followOrganization, unfollowOrganization } from "@/app/actions/follow";
import { followNotice } from "@/lib/follows";

const base = "inline-flex items-center justify-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold";
const off = `${base} bg-card text-fg hover:bg-inset`;
const on = `${base} border-primary bg-accent-soft text-heading hover:bg-inset`;

type Props = {
  organizationId: string;
  organizationName: string;
  following: boolean;
  signedIn: boolean;
  /** This page's path and query, to come back to after the action. */
  returnTo: string;
};

export function FollowButton({ organizationId, organizationName, following, signedIn, returnTo }: Props) {
  if (!signedIn) {
    return (
      <Link href={`/signin?callbackUrl=${encodeURIComponent(returnTo)}`} className={off} aria-label={`Sign in to follow ${organizationName}`}>
        Follow
      </Link>
    );
  }
  return (
    <form action={following ? unfollowOrganization : followOrganization}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        className={following ? on : off}
        aria-pressed={following}
        aria-label={following ? `Following ${organizationName}. Unfollow` : `Follow ${organizationName}`}
        title={following ? "Click to unfollow" : undefined}
      >
        {following ? "Following ✓" : "Follow"}
      </button>
    </form>
  );
}

/** The result of a follow action (?notice=), shown once at the top of the page. */
export function FollowNotice({ value }: { value: unknown }) {
  const message = followNotice(value);
  if (!message) return null;
  return (
    <p role="status" className="rounded-control border bg-inset p-3 text-sm font-medium text-fg">
      {message}
    </p>
  );
}
