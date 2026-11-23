// Regions (D-028): named areas made of counties, managed by admins at
// /admin/regions. Pure form rules, unit-tested; the Server Actions in
// src/app/admin/regions/actions.ts apply them.
import { z } from "zod";
import { stateCode } from "@/lib/everyorg/address";
import { countyKey, normalizeCountyName, REGION_SLUG, type RegionCountyRef } from "@/lib/area";

/** "South Florida" → "south-florida". Never 2 characters, so it can't be read as a state code. */
export function regionSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/**
 * Reads the counties box: one per line, "County, ST" (state as a code or a
 * name; "County" after the name is optional). Duplicates are dropped. Null
 * if any line can't be read, so an admin never saves half of what they typed.
 */
export function parseCountyLines(text: string): RegionCountyRef[] | null {
  const counties: RegionCountyRef[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const comma = line.lastIndexOf(",");
    if (comma < 0) return null;
    const county = normalizeCountyName(line.slice(0, comma));
    const state = stateCode(line.slice(comma + 1));
    if (!state || !/^[\p{L} .'-]{1,60}$/u.test(county)) return null;
    const key = `${state}:${countyKey(county)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counties.push({ state, county });
  }
  return counties;
}

/** Shows a region's counties in the box, one per line. */
export function countyLines(counties: readonly RegionCountyRef[]): string {
  return counties.map((c) => `${c.county}, ${c.state}`).join("\n");
}

const regionFields = {
  name: z
    .string()
    .trim()
    .transform((n) => n.replace(/\s+/g, " "))
    .pipe(z.string().min(3).max(60).regex(/^[\p{L}\p{N} .,'&()-]+$/u)),
  counties: z
    .string()
    .max(5000)
    .transform((text, ctx) => {
      const parsed = parseCountyLines(text);
      if (!parsed || parsed.length === 0 || parsed.length > 200) {
        ctx.addIssue({ code: "custom", message: "counties" });
        return z.NEVER;
      }
      return parsed;
    }),
};

/** New region: a name (its web address is made from it) and its counties. */
export const createRegionForm = z
  .object(regionFields)
  .transform((r) => ({ ...r, slug: regionSlug(r.name) }))
  .refine((r) => r.slug.length >= 3 && REGION_SLUG.test(r.slug));

/** Editing a region: its name and counties. The web address stays, so saved links and My area keep working. */
export const saveRegionForm = z.object({ regionId: z.string().trim().min(1).max(64), ...regionFields });

export const regionIdForm = z.object({ regionId: z.string().trim().min(1).max(64) });
