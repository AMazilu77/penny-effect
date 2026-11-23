// "Most supported" on the profile page: the organization, and the cause,
// the user has given the most to. Counts only COMPLETED donations (money the
// donation partner confirmed, D-011); pending, failed, refunded and disputed
// gifts never count. Pure, so it can be unit-tested; the page runs the query.

/** One row of `donation.groupBy({ by: ["organizationId"], where: { userId, status: "COMPLETED" } })`, joined to its organization. */
export type OrgGiving = {
  organization: {
    id: string;
    name: string;
    // Linkable only when the organization is still visible to users.
    slug: string | null;
    categories: readonly { id: string; name: string; slug: string }[];
  };
  totalCents: number;
  gifts: number;
};

/** `slug`: the organization's page slug (null when it isn't visible to users), or the cause's slug. */
export type Supported = { id: string; name: string; slug: string | null; totalCents: number; gifts: number };

export type TopSupported = { organization: Supported | null; cause: Supported | null };

/**
 * Highest total first; a tie goes to more gifts, then to the name (A–Z), so
 * the answer never depends on database order.
 */
function better(a: Supported, b: Supported): boolean {
  if (a.totalCents !== b.totalCents) return a.totalCents > b.totalCents;
  if (a.gifts !== b.gifts) return a.gifts > b.gifts;
  return a.name.localeCompare(b.name) < 0;
}

function best(candidates: Iterable<Supported>): Supported | null {
  let top: Supported | null = null;
  for (const c of candidates) {
    if (c.totalCents <= 0 || c.gifts <= 0) continue;
    if (!top || better(c, top)) top = c;
  }
  return top;
}

/**
 * The top organization and the top cause. A gift to an organization in two
 * causes counts in full toward each (it supports both); the cause total is
 * the sum over its organizations. Both are null when there are no completed
 * gifts, and the cause is null when the organizations given to have no cause.
 */
export function topSupported(rows: readonly OrgGiving[]): TopSupported {
  const organization = best(
    rows.map((r) => ({ id: r.organization.id, name: r.organization.name, slug: r.organization.slug, totalCents: r.totalCents, gifts: r.gifts })),
  );

  const causes = new Map<string, Supported>();
  for (const row of rows) {
    // An organization listed under the same cause twice still counts once.
    const seen = new Set<string>();
    for (const category of row.organization.categories) {
      if (seen.has(category.id)) continue;
      seen.add(category.id);
      const current = causes.get(category.id) ?? { id: category.id, name: category.name, slug: category.slug, totalCents: 0, gifts: 0 };
      current.totalCents += row.totalCents;
      current.gifts += row.gifts;
      causes.set(category.id, current);
    }
  }

  return { organization, cause: best(causes.values()) };
}
