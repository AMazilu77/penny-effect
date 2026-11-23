// Public page for one organization: /org/<every.org slug>.
// Shows only organizations users may see (active, verified, EIN, disbursable;
// src/lib/organizations.ts). Anything else, including hidden or unverified
// organizations, is a plain 404, so the URL doesn't reveal what's in review.
// No sign-in needed: it's the page to share about a charity.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { cache } from "react";
import { CharityNavigatorBadge } from "@/components/CharityNavigatorBadge";
import { FollowButton, FollowNotice } from "@/components/FollowButton";
import { authOptions } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { MediaImage } from "@/components/ui/MediaImage";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { buttonPrimary, buttonSecondary, textLink } from "@/components/ui/buttons";
import { ReadMore } from "@/components/feed/ReadMore";
import { CN_EXPLAINER } from "@/lib/charity-navigator/rating";
import { orgSlug, previewText, safeExternalUrl } from "@/lib/feed";
import { SERVICE_AREA_HELP, SERVICE_AREA_LABELS, placeLine } from "@/lib/area";
import { highestImpactLabel } from "@/lib/highest-impact";
import { sourceSite } from "@/lib/news-image";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// One query per request, shared by generateMetadata and the page.
const loadOrg = cache(async (raw: string) => {
  const slug = orgSlug(raw);
  if (!slug) return null;
  return prisma.organization.findFirst({
    where: { everyOrgSlug: slug, ...VISIBLE_ORGANIZATION_WHERE },
    select: {
      id: true,
      name: true,
      description: true,
      website: true,
      everyOrgSlug: true,
      logoUrl: true,
      coverImageUrl: true,
      ein: true,
      locationCity: true,
      locationState: true,
      locationCounty: true,
      serviceArea: true,
      acceptsVolunteers: true,
      volunteerUrl: true,
      cnScore: true,
      cnStars: true,
      cnProfileUrl: true,
      cnCheckedAt: true,
      cnSource: true,
      categories: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
      newsItems: {
        where: { sourceUrl: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, content: true, sourceUrl: true, createdAt: true },
      },
    },
  });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await loadOrg((await params).slug);
  if (!org) return { title: "Organization not found" };
  return { title: org.name, description: org.description ?? `${org.name}, a verified nonprofit on The Penny Effect.` };
}

/** The request's time, for the "rating may be out of date" check (read outside rendering). */
function requestTime(): Date {
  return new Date();
}

export default async function OrganizationPage({ params, searchParams }: Props) {
  const org = await loadOrg((await params).slug);
  if (!org) notFound();
  const now = requestTime();
  const notice = (await searchParams)?.notice;

  // Signed-in visitors see whether they follow it (the page itself is public).
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const following = userId
    ? (await prisma.organizationFollow.count({ where: { userId, organizationId: org.id } })) > 0
    : false;

  const website = safeExternalUrl(org.website);
  const everyOrgUrl = org.everyOrgSlug ? `https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}` : null;
  const impactLabel = highestImpactLabel({ ein: org.ein, categorySlugs: org.categories.map((c) => c.slug) });
  const place = placeLine(org);
  const volunteerUrl = org.acceptsVolunteers ? safeExternalUrl(org.volunteerUrl) : null;
  const einText = org.ein ? `${org.ein.slice(0, 2)}-${org.ein.slice(2)}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-(--space-section)">
      <FollowNotice value={notice} />
      <Card className="overflow-hidden p-0">
        {org.coverImageUrl && (
          <figure className="border-b">
            <div className="relative aspect-[3/1] overflow-hidden bg-inset">
              <MediaImage src={`/media/org/${org.id}/cover`} alt="" sizes="(min-width: 768px) 768px, 100vw" />
            </div>
            {everyOrgUrl && (
              <figcaption className="px-(--space-card) py-2 text-sm text-muted">
                Image:{" "}
                <a href={everyOrgUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Every.org
                </a>
              </figcaption>
            )}
          </figure>
        )}
        <div className="space-y-4 p-(--space-card)">
          <div className="flex items-center gap-4">
            <OrgLogo orgId={org.id} hasLogo={Boolean(org.logoUrl)} size={64} />
            <div>
              <h1 className="text-3xl font-bold">{org.name}</h1>
              {impactLabel && <p className="font-medium text-muted">{impactLabel}</p>}
            </div>
          </div>
          {org.description && <p className="text-lg text-fg">{org.description}</p>}
          <p className="text-sm text-muted">
            Verified nonprofit{einText && <> · EIN {einText}</>}
          </p>
          {(place || org.serviceArea || org.acceptsVolunteers) && (
            <dl className="grid gap-3 sm:grid-cols-3">
              {place && (
                <div className="rounded-control border bg-inset p-3">
                  <dt className="text-sm font-medium text-muted">Based in</dt>
                  <dd className="font-semibold text-heading">{place}</dd>
                </div>
              )}
              {org.serviceArea && (
                <div className="rounded-control border bg-inset p-3">
                  <dt className="text-sm font-medium text-muted">Serves</dt>
                  <dd>
                    <span className="font-semibold text-heading">{SERVICE_AREA_LABELS[org.serviceArea]}</span>
                    <span className="block text-sm text-muted">{SERVICE_AREA_HELP[org.serviceArea]}</span>
                  </dd>
                </div>
              )}
              {org.acceptsVolunteers && (
                <div className="rounded-control border bg-inset p-3">
                  <dt className="text-sm font-medium text-muted">Volunteering</dt>
                  <dd className="font-semibold text-heading">
                    {volunteerUrl ? "Volunteers welcome" : "Volunteers welcome: contact them through their website"}
                  </dd>
                </div>
              )}
            </dl>
          )}
          <CharityNavigatorBadge rating={org} now={now} detailed />
          {org.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {org.categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/discover?category=${encodeURIComponent(c.slug)}`}
                  className="rounded-full border bg-inset px-3 py-1 text-sm text-fg hover:bg-accent-soft"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Link href={`/dashboard?give=${encodeURIComponent(org.id)}#give`} className={buttonPrimary}>
              Give to {org.name}
            </Link>
            <FollowButton
              organizationId={org.id}
              organizationName={org.name}
              following={following}
              signedIn={userId !== null}
              returnTo={`/org/${org.everyOrgSlug}`}
            />
            {volunteerUrl && (
              <a href={volunteerUrl} target="_blank" rel="noopener noreferrer" className={buttonSecondary}>
                Volunteer
              </a>
            )}
            {everyOrgUrl && (
              <a href={everyOrgUrl} target="_blank" rel="noopener noreferrer" className={buttonSecondary}>
                View on Every.org
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className={textLink}>
                Website
              </a>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent updates" description="Each one links to where the organization published it." />
        {org.newsItems.length === 0 ? (
          <p className="text-muted">No updates posted yet.</p>
        ) : (
          <ul className="divide-y">
            {org.newsItems.map((item) => {
              const href = safeExternalUrl(item.sourceUrl);
              const { preview, truncated } = previewText(item.content ?? "");
              return (
                <li key={item.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <time dateTime={item.createdAt.toISOString()} className="text-sm text-muted">
                    {dateFormat.format(item.createdAt)}
                  </time>
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  {item.content &&
                    (truncated ? (
                      <ReadMore preview={preview} full={item.content} />
                    ) : (
                      <p className="whitespace-pre-line text-fg">{item.content}</p>
                    ))}
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={textLink}>
                      Read the original on {sourceSite(href)}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {org.cnScore !== null && (
        <p className="text-sm text-muted">
          Rating from{" "}
          <a href="https://www.charitynavigator.org/" target="_blank" rel="noopener" className="underline">
            Charity Navigator
          </a>
          , shown as published. {CN_EXPLAINER}
        </p>
      )}
    </div>
  );
}
