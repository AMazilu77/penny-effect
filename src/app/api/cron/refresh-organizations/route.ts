// Weekly refresh of organization details from Every.org. Called by Vercel
// Cron (schedule in vercel.json; Vercel only runs crons on the production
// deployment). The rules are in src/lib/org-refresh.ts.
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createEveryOrgClient, EveryOrgError } from "@/lib/everyorg/client";
import { refreshOrganizations, type RefreshStore } from "@/lib/org-refresh";
import { prisma } from "@/lib/prisma";

// Never cache or prerender: every call does the work.
export const dynamic = "force-dynamic";
// Seconds Vercel lets this function run. The refresh stops starting new
// requests after 45 s (REFRESH_TIME_BUDGET_MS).
export const maxDuration = 60;

const store: RefreshStore = {
  candidates: (limit) =>
    prisma.organization
      .findMany({
        where: { status: "ACTIVE", everyOrgId: { not: null } },
        orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
        take: limit,
        select: { id: true, everyOrgId: true, ein: true, verifiedAt: true },
      })
      // The where clause guarantees everyOrgId; this narrows the type.
      .then((orgs) => orgs.flatMap((o) => (o.everyOrgId ? [{ ...o, everyOrgId: o.everyOrgId }] : []))),

  async update(id, data) {
    try {
      await prisma.organization.update({ where: { id }, data, select: { id: true } });
      return "ok";
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "conflict";
      throw error;
    }
  },

  async markNotFound(id, now) {
    await prisma.organization.update({
      where: { id },
      data: { isDisbursable: false, lastSyncedAt: now },
      select: { id: true },
    });
  },
};

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await refreshOrganizations({ store, client: createEveryOrgClient() });
    // Counts only, never organization data; visible in Vercel's function logs.
    console.log("[org-refresh]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (error) {
    // EveryOrgError messages never contain the key; anything else stays private.
    console.error("[org-refresh] failed:", error instanceof EveryOrgError ? error.message : "unexpected error");
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
