// One organization: Every.org link, verification, visibility, categories.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { verifyBlocker, ERRORS } from "@/lib/admin-orgs";
import { safeExternalUrl } from "@/lib/feed";
import { SERVICE_AREAS, SERVICE_AREA_HELP, SERVICE_AREA_LABELS } from "@/lib/area";
import { stateName } from "@/lib/everyorg/address";
import { prisma } from "@/lib/prisma";
import { Flash } from "../../Flash";
import { OrgBadges, OrgStatusExplained } from "../../badges";
import { Field } from "../../Field";
import { CharityNavigatorBadge } from "@/components/CharityNavigatorBadge";
import { cnProfileUrlFor } from "@/lib/charity-navigator/rating";
import { HIGHEST_IMPACT_RULE, HIGHEST_IMPACT_SLUG } from "@/lib/highest-impact";
import {
  GIVEWELL_TOP_CHARITIES_URL,
  VERIFICATION_NOTE_MAX,
  VERIFICATION_NOTE_MIN,
  verificationChecklist,
} from "@/lib/verification-guide";
import {
  hideOrganization,
  linkOrganization,
  removeCharityNavigatorRating,
  saveCharityNavigatorRating,
  saveCategories,
  saveLocation,
  showOrganization,
  restoreEveryOrgAddress,
  unverifyOrganization,
  verifyOrganization,
} from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const field = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";
const button =
  "inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:border-dashed disabled:bg-inset disabled:text-muted";
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-card border bg-card p-(--space-card) shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** The request's time, for the "rating may be out of date" check (read outside rendering). */
function requestTime(): Date {
  return new Date();
}

export default async function AdminOrganizationPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const [{ id }, flash] = await Promise.all([params, searchParams]);

  const [org, categories, regionCounties] = await Promise.all([
    prisma.organization.findUnique({
      where: { id },
      include: {
        categories: { select: { id: true } },
        verifiedBy: { select: { name: true, email: true } },
        _count: { select: { donations: true, newsItems: true, followers: true } },
      },
    }),
    prisma.causeCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    // Counties already used by regions, suggested in the county box so spellings match.
    prisma.regionCounty.findMany({ distinct: ["state", "county"], select: { state: true, county: true }, orderBy: [{ state: "asc" }, { county: "asc" }] }),
  ]);
  if (!org) notFound();

  const blocker = verifyBlocker(org);
  const now = requestTime();
  const website = safeExternalUrl(org.website);
  const checklist = verificationChecklist({ ein: org.ein, everyOrgSlug: org.everyOrgSlug, website });
  const highestImpactId = categories.find((c) => c.slug === HIGHEST_IMPACT_SLUG)?.id;
  const selected = new Set(org.categories.map((c) => c.id));
  const hidden = <input type="hidden" name="organizationId" value={org.id} />;
  const inHighestImpact = highestImpactId !== undefined && selected.has(highestImpactId);

  return (
    <div className="space-y-4">
      <Link href="/admin/organizations" className="text-sm text-link underline">
        ← All organizations
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <OrgBadges org={org} />
      </div>
      <OrgStatusExplained org={org} />
      <Flash params={flash} />

      <Section title="Details">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">EIN</dt>
          <dd>{org.ein ?? "—"}</dd>
          <dt className="text-muted">Every.org</dt>
          <dd>
            {org.everyOrgSlug ? (
              <a href={`https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}`} target="_blank" rel="noopener noreferrer" className="text-link underline">
                {org.everyOrgSlug}
              </a>
            ) : (
              "not linked"
            )}
          </dd>
          <dt className="text-muted">Location</dt>
          <dd>
            {[org.locationCity, org.locationState].filter(Boolean).join(", ") || "unknown"}
            {org.locationZip && ` ${org.locationZip}`}
            {org.locationCounty && ` · ${org.locationCounty} County`}
            {org.locationManual ? (
              <span className="text-muted"> (entered by an admin; Every.org refreshes leave it alone)</span>
            ) : (
              !org.locationCity && org.everyOrgId && <span className="text-muted"> (filled on the next refresh from Every.org)</span>
            )}
          </dd>
          <dt className="text-muted">Serves</dt>
          <dd>{org.serviceArea ? SERVICE_AREA_LABELS[org.serviceArea] : <span className="text-warn">not set (needed to verify)</span>}</dd>
          <dt className="text-muted">Followers</dt>
          <dd>
            {org._count.followers}
            <span className="text-muted"> (admins only; never shown publicly for now)</span>
          </dd>
          <dt className="text-muted">Accepts donations</dt>
          <dd>{org.everyOrgId ? (org.isDisbursable ? "yes (Every.org)" : "no (Every.org)") : "unknown"}</dd>
          <dt className="text-muted">Website</dt>
          <dd className="break-all">
            {website ? (
              <a href={website} target="_blank" rel="noopener noreferrer" className="text-link underline">
                {website}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-muted">Last refreshed</dt>
          <dd>{org.lastSyncedAt ? `${dateTime.format(org.lastSyncedAt)} UTC` : "never"}</dd>
          <dt className="text-muted">History</dt>
          <dd>
            {org._count.donations} donations, {org._count.newsItems} news items
          </dd>
        </dl>
        {org.description && <p className="text-sm text-fg">{org.description}</p>}
      </Section>

      <Section title={org.everyOrgId ? "Refresh or re-link Every.org record" : "Link to Every.org"}>
        <form action={linkOrganization} className="space-y-3">
          {hidden}
          <Field
            id="everyOrgRef"
            label="Every.org profile or EIN"
            help="The last part of the organization's Every.org address (every.org/againstmalaria → againstmalaria), or its 9-digit EIN. We copy the EIN, website, description, logo and whether it can receive gifts. The name shown on our site stays as it is. If the EIN changes, the verification is removed so someone checks again."
          >
            <input
              name="everyOrgRef"
              required
              defaultValue={org.everyOrgSlug ?? ""}
              className="w-full max-w-md rounded-control border bg-inset px-3 py-2 text-fg"
            />
          </Field>
          <button className={button}>{org.everyOrgId ? "Refresh from Every.org" : "Link"}</button>
        </form>
      </Section>

      <Section title="Location and volunteering">
        <p className="text-sm text-muted">
          City, state and ZIP come from Every.org (the IRS address). The county doesn&apos;t, so add it: regions such as South Florida
          match organizations by county. Check the organization&apos;s website or its 990 on ProPublica. Only a city or county,
          never a street address, is shown to donors.{" "}
          <Link href="/admin/guide/verify#location" className="text-link underline">
            How to fill this in
          </Link>
        </p>
        {!org.serviceArea && <p className="text-sm text-warn">Set who it serves before verifying.</p>}
        {(org.serviceArea === "LOCAL" || org.serviceArea === "REGIONAL") && !org.locationCounty && (
          <p className="text-sm text-warn">Add the county, or it won&apos;t appear when donors filter by a region.</p>
        )}
        <form action={saveLocation} className="space-y-4">
          {hidden}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="locationCity" label="City" help="As people write it, e.g. West Palm Beach (not “West Palm Bch”).">
              <input name="locationCity" defaultValue={org.locationCity ?? ""} maxLength={80} className={field} />
            </Field>
            <Field id="locationState" label="State" help="Two-letter code or name. Needed for a city or county.">
              <input name="locationState" defaultValue={org.locationState ?? ""} maxLength={30} className={field} />
            </Field>
            <Field id="locationZip" label="ZIP" help="5 digits.">
              <input name="locationZip" inputMode="numeric" pattern="[0-9]{5}" defaultValue={org.locationZip ?? ""} className={field} />
            </Field>
            <Field id="locationCounty" label="County" help="Without “County”, e.g. Palm Beach. Suggestions are the counties regions use.">
              <input name="locationCounty" list="region-counties" defaultValue={org.locationCounty ?? ""} maxLength={60} className={field} />
            </Field>
            <datalist id="region-counties">
              {regionCounties.map((c) => (
                <option key={`${c.state}-${c.county}`} value={c.county}>
                  {c.county}, {stateName(c.state)}
                </option>
              ))}
            </datalist>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-heading">Who it serves</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICE_AREAS.map((a) => (
                <label key={a} className="flex gap-3 rounded-control border bg-inset p-3">
                  <input type="radio" name="serviceArea" value={a} defaultChecked={org.serviceArea === a} className="mt-1 h-5 w-5 shrink-0" />
                  <span>
                    <span className="block font-semibold text-heading">{SERVICE_AREA_LABELS[a]}</span>
                    <span className="block text-sm">{SERVICE_AREA_HELP[a]}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-sm text-muted">National organizations are listed in their own section on Discover, so local ones aren&apos;t buried.</p>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="acceptsVolunteers" defaultChecked={org.acceptsVolunteers} className="h-5 w-5" />
            Takes volunteers (shown on Discover&apos;s &ldquo;Volunteer opportunities&rdquo; filter)
          </label>
          <Field
            id="volunteerUrl"
            label="Volunteer page (optional)"
            help="The organization's own page about volunteering, starting with https://. Shown as a Volunteer button only when “Takes volunteers” is ticked."
          >
            <input name="volunteerUrl" type="url" defaultValue={org.volunteerUrl ?? ""} maxLength={500} className={field} />
          </Field>
          <button className={button}>Save location and volunteering</button>
        </form>
        {org.locationManual && org.everyOrgId && (
          <form action={restoreEveryOrgAddress}>
            {hidden}
            <button className={button}>Use Every.org&apos;s address again</button>
          </form>
        )}
      </Section>

      <Section title="Verification">
        {org.verifiedAt ? (
          <>
            <p className="text-sm">
              Verified {dateTime.format(org.verifiedAt)} UTC
              {org.verifiedBy && ` by ${org.verifiedBy.name ?? org.verifiedBy.email ?? "an admin"}`}.
            </p>
            {org.verificationNote ? (
              <blockquote className="rounded-control border bg-inset p-3 text-sm">
                <span className="font-semibold text-heading">Note: </span>
                {org.verificationNote}
              </blockquote>
            ) : (
              <p className="text-sm text-muted">Verified before notes existed, so there is no note.</p>
            )}
            <form action={unverifyOrganization}>
              {hidden}
              <button className={button}>Remove verification</button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Verifying tells donors a person checked that this is a real, registered US charity in good standing.
              Donors see it once it&apos;s verified, active, has an EIN and can receive gifts through Every.org.{" "}
              <Link href="/admin/guide/verify" className="text-link underline">
                How to verify a nonprofit
              </Link>
            </p>
            {blocker ? (
              <p className="text-sm text-warn">{ERRORS[blocker]}</p>
            ) : (
              <form action={verifyOrganization} className="space-y-4">
                {hidden}
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-heading">Before you verify, check each one:</legend>
                  {checklist.map((step) => (
                    <label key={step.id} className="flex gap-3 rounded-control border bg-inset p-3">
                      <input type="checkbox" required name={`check-${step.id}`} className="mt-1 h-5 w-5 shrink-0" />
                      <span className="space-y-1">
                        <span className="block font-semibold text-heading">{step.title}</span>
                        <span className="block text-sm">{step.check}</span>
                        {step.links.length > 0 && (
                          <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            {step.links.map((l) => (
                              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="text-link underline">
                                {l.label}
                              </a>
                            ))}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                  {inHighestImpact && (
                    <p className="rounded-control border border-warn bg-warn-soft p-3 text-sm text-warn">
                      This organization is in Highest Impact. Only: {HIGHEST_IMPACT_RULE} Check{" "}
                      <a href={GIVEWELL_TOP_CHARITIES_URL} target="_blank" rel="noopener noreferrer" className="underline">
                        GiveWell&apos;s Top Charities page
                      </a>
                      .
                    </p>
                  )}
                </fieldset>
                <Field
                  id="verificationNote"
                  label="Verification note"
                  help={`What you checked, in a sentence or two (${VERIFICATION_NOTE_MIN}–${VERIFICATION_NOTE_MAX} characters). Other admins see it next to your name. Example: “IRS listed, not revoked; 990 for 2024 on ProPublica; EIN in website footer.”`}
                >
                  <textarea
                    name="verificationNote"
                    required
                    minLength={VERIFICATION_NOTE_MIN}
                    maxLength={VERIFICATION_NOTE_MAX}
                    rows={3}
                    className="w-full rounded-control border bg-inset px-3 py-2 text-base text-fg"
                  />
                </Field>
                <button className={button}>Verify</button>
              </form>
            )}
          </>
        )}
      </Section>

      <Section title="Charity Navigator rating (optional)">
        <CharityNavigatorBadge rating={org} now={now} detailed />
        {org.cnSource && (
          <p className="text-sm text-muted">
            {org.cnSource === "API" ? "From Charity Navigator's API (refreshed weekly)." : "Entered by an admin from the Charity Navigator profile."}
          </p>
        )}
        {org.ein ? (
          <>
            <form action={saveCharityNavigatorRating} className="grid gap-3 sm:grid-cols-[8rem_8rem_1fr] sm:items-start">
              {hidden}
              <Field id="cnScore" label="Score (0–100)" help="As shown on the profile.">
                <input name="cnScore" inputMode="numeric" required defaultValue={org.cnScore ?? ""} className={field} />
              </Field>
              <Field id="cnStars" label="Stars (0–4)" help="Leave empty if none shown.">
                <input name="cnStars" inputMode="numeric" defaultValue={org.cnStars ?? ""} className={field} />
              </Field>
              <Field
                id="cnProfileUrl"
                label="Profile link"
                help="This organization's Charity Navigator page. Open it, copy the score and stars exactly, then save. The date is set to today."
              >
                <input name="cnProfileUrl" type="url" required defaultValue={org.cnProfileUrl ?? cnProfileUrlFor(org.ein)} className={field} />
              </Field>
              <div className="sm:col-span-3">
                <button className={button}>Save rating</button>
              </div>
            </form>
            {org.cnScore !== null && (
              <form action={removeCharityNavigatorRating}>
                {hidden}
                <button className={button}>Remove rating</button>
              </form>
            )}
            <p className="text-sm">
              <a href={cnProfileUrlFor(org.ein)} target="_blank" rel="noopener" className="text-link underline">
                Open its Charity Navigator profile
              </a>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Needs an EIN first.</p>
        )}
      </Section>

      <Section title="Visibility">
        <p className="text-sm text-muted">
          {org.status === "HIDDEN"
            ? "Hidden: donors don't see it anywhere. Nothing is deleted, and past gifts still show in donors' history. Make it active again once the problem is resolved."
            : "Active. If something looks wrong, hide it and ask another admin. Hiding never deletes anything; donors' past gifts stay in their history."}
        </p>
        <form action={org.status === "HIDDEN" ? showOrganization : hideOrganization}>
          {hidden}
          <button className={button}>{org.status === "HIDDEN" ? "Make active" : "Hide"}</button>
        </form>
      </Section>

      <Section title="Categories">
        <p className="text-sm text-muted">
          Tick every cause this organization works on. Donors who follow a cause see its organizations and their news.
        </p>
        <form action={saveCategories} className="space-y-3">
          {hidden}
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={selected.has(c.id)} />
                {c.name}
                {c.slug === HIGHEST_IMPACT_SLUG && <span className="text-sm text-muted">(only: {HIGHEST_IMPACT_RULE})</span>}
              </label>
            ))}
          </div>
          <button className={button}>Save categories</button>
        </form>
      </Section>
    </div>
  );
}
