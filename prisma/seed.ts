// LOCAL development seed: `pnpm prisma db seed`.
//
// - Never deletes anything. Safe to run again and again (upserts).
// - Refuses to run when VERCEL_ENV=production.
// - Seeds the 9 categories and a dozen real nonprofits (EINs checked on
//   Every.org), marked verified so they show up locally like a reviewed
//   directory. No news: news must link to a real source (admins post it).
//
// Organizations are matched by EIN, then Every.org slug, then exact name, so
// rows from the old seed get linked instead of duplicated. Existing category
// links are kept; the seed only adds its own.
import { prisma } from "../src/lib/prisma";
import { SEED_CATEGORIES, SEED_ORGANIZATIONS, seedBlockedReason } from "./seed-data";

// Seeded rows are marked verified for local testing only; say so in the note.
const SEED_NOTE = "Seeded for local development, not a real admin review.";

async function main() {
  const blocked = seedBlockedReason(process.env);
  if (blocked) {
    console.error(`Refusing to seed: ${blocked}. The seed is for local databases only.`);
    process.exit(1);
  }

  for (const c of SEED_CATEGORIES) {
    await prisma.causeCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  console.log(`Categories: ${SEED_CATEGORIES.length} ensured.`);

  const categoryIds = new Map(
    (await prisma.causeCategory.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );

  let created = 0;
  let updated = 0;
  for (const org of SEED_ORGANIZATIONS) {
    const categories = org.categorySlugs.flatMap((slug) => {
      const id = categoryIds.get(slug);
      return id ? [{ id }] : [];
    });
    const fields = {
      ein: org.ein,
      everyOrgSlug: org.everyOrgSlug,
      website: org.website,
      isDisbursable: true,
      status: "ACTIVE" as const,
    };

    const existing = await prisma.organization.findFirst({
      where: { OR: [{ ein: org.ein }, { everyOrgSlug: org.everyOrgSlug }, { name: org.name }] },
      select: { id: true, description: true, verifiedAt: true },
    });

    if (existing) {
      await prisma.organization.update({
        where: { id: existing.id },
        data: {
          ...fields,
          description: existing.description ?? org.description,
          verifiedAt: existing.verifiedAt ?? new Date(),
          ...(existing.verifiedAt ? {} : { verificationNote: SEED_NOTE }),
          categories: { connect: categories },
        },
      });
      updated++;
    } else {
      await prisma.organization.create({
        data: {
          name: org.name,
          description: org.description,
          ...fields,
          verifiedAt: new Date(),
          verificationNote: SEED_NOTE,
          categories: { connect: categories },
        },
      });
      created++;
    }
  }
  console.log(`Organizations: ${created} created, ${updated} updated (${SEED_ORGANIZATIONS.length} total).`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
