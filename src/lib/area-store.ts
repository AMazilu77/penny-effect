// Database access for local nonprofits (D-028): regions, the signed-in
// user's My area, and the organizations serving an area. Every function that
// touches a user takes the id from the caller (the session). Kept apart from
// the route handlers and pages so their tests can replace it with spies.
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { myArea, myAreaColumns, servesArea, type Area, type MyAreaInput, type RegionDef } from "@/lib/area";

export type RegionRow = RegionDef & { id: string };

const REGION_SELECT = {
  id: true,
  slug: true,
  name: true,
  counties: { select: { state: true, county: true }, orderBy: [{ state: "asc" }, { county: "asc" }] },
} satisfies Prisma.RegionSelect;

/** Every region, A–Z, with its counties. A handful of rows. */
export async function loadRegions(): Promise<RegionRow[]> {
  return prisma.region.findMany({ select: REGION_SELECT, orderBy: { name: "asc" } });
}

/** The user's My area, or null when none is set (or the user is gone). */
export async function loadMyArea(userId: string): Promise<Area | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { areaCity: true, areaState: true, areaRegion: { select: REGION_SELECT } },
  });
  return user ? myArea(user) : null;
}

export type SaveAreaResult = { ok: true } | { ok: false; reason: "unknown-region" | "no-user" };

/** Saves (or clears) the signed-in user's My area. Only this user's row is touched. */
export async function saveMyArea(userId: string, input: MyAreaInput): Promise<SaveAreaResult> {
  let columns;
  if (input.kind === "region") {
    const region = await prisma.region.findUnique({ where: { slug: input.regionSlug }, select: { id: true } });
    if (!region) return { ok: false, reason: "unknown-region" };
    columns = myAreaColumns({ kind: "region", regionId: region.id });
  } else {
    columns = myAreaColumns(input);
  }
  const { count } = await prisma.user.updateMany({ where: { id: userId }, data: columns });
  return count === 1 ? { ok: true } : { ok: false, reason: "no-user" };
}

/**
 * Ids of the visible organizations serving an area (src/lib/area.ts
 * servesArea): the feed's Near me tab. The directory is small, so the
 * matching runs here rather than in SQL, with exactly Discover's rules.
 */
export async function orgIdsServing(area: Area): Promise<string[]> {
  const orgs = await prisma.organization.findMany({
    where: VISIBLE_ORGANIZATION_WHERE,
    select: { id: true, locationState: true, locationCounty: true, locationCity: true, serviceArea: true },
  });
  return orgs.filter((o) => servesArea(o, area)).map((o) => o.id);
}
