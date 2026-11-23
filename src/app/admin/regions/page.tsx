// Regions (D-028): named areas made of counties that donors can filter by on
// Discover and choose as My area, e.g. "South Florida" = Palm Beach +
// Broward + Miami-Dade. Organizations match by their county and state.
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { servesArea } from "@/lib/area";
import { countyLines } from "@/lib/regions";
import { Flash } from "../Flash";
import { Field } from "../Field";
import { createRegion, deleteRegion, saveRegion } from "./actions";

export const metadata = { title: "Regions | Admin" };

const field = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";
const button =
  "inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset";

export default async function AdminRegionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const [flash, regions, orgs] = await Promise.all([
    searchParams,
    prisma.region.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        counties: { select: { state: true, county: true }, orderBy: [{ state: "asc" }, { county: "asc" }] },
        _count: { select: { users: true } },
      },
    }),
    prisma.organization.findMany({
      where: VISIBLE_ORGANIZATION_WHERE,
      select: { locationState: true, locationCounty: true, locationCity: true, serviceArea: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Regions</h1>
        <p className="text-sm text-muted">
          Areas donors can pick on Discover and as their area, made of counties. An organization is in a region when its
          county and state match one of the region&apos;s; set those on the organization&apos;s page.{" "}
          <Link href="/admin/guide/verify#location" className="text-link underline">
            More in the guide
          </Link>
        </p>
      </div>
      <Flash params={flash} />

      {regions.map((r) => {
        const live = orgs.filter((o) => servesArea(o, { kind: "region", region: r, city: null })).length;
        return (
          <section key={r.id} className="space-y-3 rounded-card border bg-card p-(--space-card) shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{r.name}</h2>
              <p className="text-sm text-muted">
                <Link href={`/discover?area=${encodeURIComponent(r.slug)}`} className="text-link underline">
                  /discover?area={r.slug}
                </Link>{" "}
                · {live} live organizations · {r._count.users} people chose it as their area
              </p>
            </div>
            <form action={saveRegion} className="space-y-3">
              <input type="hidden" name="regionId" value={r.id} />
              <Field id={`name-${r.id}`} label="Name" help="Shown to donors. Its web address stays the same if you rename it.">
                <input name="name" required minLength={3} maxLength={60} defaultValue={r.name} className={`${field} max-w-md`} />
              </Field>
              <Field id={`counties-${r.id}`} label="Counties" help="One per line: county name, then the state, e.g. “Palm Beach, FL”.">
                <textarea name="counties" required rows={Math.max(2, r.counties.length + 1)} defaultValue={countyLines(r.counties)} className={`${field} max-w-md`} />
              </Field>
              <button className={button}>Save region</button>
            </form>
            <form action={deleteRegion} className="flex flex-wrap items-center gap-3 border-t pt-3">
              <input type="hidden" name="regionId" value={r.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirm" required className="h-5 w-5" />
                Delete this region (people who chose it as their area will have none)
              </label>
              <button className={`${button} text-danger`}>Delete</button>
            </form>
          </section>
        );
      })}

      <section className="space-y-3 rounded-card border bg-card p-(--space-card) shadow-sm">
        <h2 className="font-semibold">Add a region</h2>
        <form action={createRegion} className="space-y-3">
          <Field id="new-name" label="Name" help="e.g. Treasure Coast. Its web address is made from the name.">
            <input name="name" required minLength={3} maxLength={60} className={`${field} max-w-md`} />
          </Field>
          <Field id="new-counties" label="Counties" help="One per line: “Martin, FL”, “St. Lucie, FL”…">
            <textarea name="counties" required rows={4} className={`${field} max-w-md`} />
          </Field>
          <button className={button}>Add region</button>
        </form>
      </section>
    </div>
  );
}
