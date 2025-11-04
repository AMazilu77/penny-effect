import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 1️⃣ Wipe existing data for clean reseed
  await prisma.newsItem.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.causeCategory.deleteMany();

  // 2️⃣ Seed categories
  const categories = [
    { name: "Humanitarian Aid", description: "Disaster relief and food security." },
    { name: "Animal Welfare", description: "Wildlife protection and animal shelters." },
    { name: "Environment", description: "Climate, reforestation, and conservation." },
    { name: "Mental Health", description: "Awareness and support for well-being." },
    { name: "Medical Research", description: "Advancing cures and biotechnology." },
    { name: "Political Reform", description: "Transparency, civil rights, and governance." },
    { name: "Education", description: "Access to learning and equal opportunities." },
    { name: "Space & Science", description: "Exploration and scientific progress." },
  ];

  for (const c of categories) {
    await prisma.causeCategory.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log("✅ Categories seeded.");

  // 3️⃣ Seed organizations
  const orgs = [
    {
      name: "UNICEF",
      description: "Protecting children's rights and providing healthcare worldwide.",
      website: "https://www.unicef.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5a/UNICEF_Logo.png",
      categories: ["Humanitarian Aid"],
    },
    {
      name: "Doctors Without Borders",
      description: "Delivering emergency medical aid globally.",
      website: "https://www.doctorswithoutborders.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/4/46/M%C3%A9decins_Sans_Fronti%C3%A8res_logo.svg",
      categories: ["Humanitarian Aid"],
    },
    {
      name: "World Wildlife Fund",
      description: "Conserving nature and reducing threats to life on Earth.",
      website: "https://www.worldwildlife.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/3/3f/WWF_logo.svg",
      categories: ["Animal Welfare", "Environment"],
    },
    {
      name: "Best Friends Animal Society",
      description: "Leading animal rescue and adoption network.",
      website: "https://bestfriends.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Best_Friends_Animal_Society_logo.svg",
      categories: ["Animal Welfare"],
    },
    {
      name: "The Ocean Cleanup",
      description: "Developing technologies to remove plastic from oceans.",
      website: "https://theoceancleanup.com",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/84/The_Ocean_Cleanup_logo.svg",
      categories: ["Environment"],
    },
    {
      name: "Rainforest Alliance",
      description: "Sustainable farming and forest protection programs.",
      website: "https://www.rainforest-alliance.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/25/Rainforest_Alliance_logo.svg",
      categories: ["Environment"],
    },
    {
      name: "Mental Health America",
      description: "Promoting mental health as part of overall wellness.",
      website: "https://www.mhanational.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/1/18/MHA_logo.png",
      categories: ["Mental Health"],
    },
    {
      name: "National Alliance on Mental Illness (NAMI)",
      description: "Advocating for awareness and access to mental health care.",
      website: "https://www.nami.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/53/NAMI_logo.svg",
      categories: ["Mental Health"],
    },
    {
      name: "American Cancer Society",
      description: "Funding cancer research and patient support.",
      website: "https://www.cancer.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/4/41/American_Cancer_Society_Logo.svg",
      categories: ["Medical Research"],
    },
    {
      name: "Michael J. Fox Foundation",
      description: "Accelerating Parkinson’s disease research.",
      website: "https://www.michaeljfox.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/b/b2/Michael_J._Fox_Foundation_logo.svg",
      categories: ["Medical Research"],
    },
    {
      name: "Electronic Frontier Foundation",
      description: "Defending digital privacy and free expression.",
      website: "https://www.eff.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5a/EFF_logo.svg",
      categories: ["Political Reform"],
    },
    {
      name: "Transparency International",
      description: "Fighting corruption and promoting accountability.",
      website: "https://www.transparency.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/64/Transparency_International_logo.svg",
      categories: ["Political Reform"],
    },
    {
      name: "Teach For All",
      description: "Expanding access to education globally.",
      website: "https://teachforall.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/ee/Teach_For_All_logo.svg",
      categories: ["Education"],
    },
    {
      name: "Room to Read",
      description: "Improving literacy and gender equality in education.",
      website: "https://www.roomtoread.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/3/3c/Room_to_Read_logo.png",
      categories: ["Education"],
    },
    {
      name: "Planetary Society",
      description: "Advancing space science and exploration.",
      website: "https://www.planetary.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/5d/The_Planetary_Society_logo.svg",
      categories: ["Space & Science"],
    },
    {
      name: "SETI Institute",
      description: "Astrobiology and the search for extraterrestrial life.",
      website: "https://www.seti.org",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/94/SETI_Institute_logo.svg",
      categories: ["Space & Science"],
    },
  ];

  for (const org of orgs) {
    const cats = await prisma.causeCategory.findMany({
      where: { name: { in: org.categories } },
    });

    await prisma.organization.create({
      data: {
        name: org.name,
        description: org.description,
        website: org.website,
        logoUrl: org.logoUrl,
        categories: { connect: cats.map((c) => ({ id: c.id })) },
      },
    });
  }
  console.log("✅ Organizations seeded.");

  // 4️⃣ Seed news items
  const newsTemplates: Record<string, string[]> = {
    "UNICEF": [
      "UNICEF launches new campaign for clean water access.",
      "Relief supplies delivered to flood-affected families.",
    ],
    "World Wildlife Fund": [
      "WWF restores mangroves in Indonesia.",
      "Tiger populations declining in South Asia, WWF warns.",
    ],
    "Electronic Frontier Foundation": [
      "EFF challenges unlawful data collection.",
      "EFF pushes for stronger digital rights legislation.",
    ],
  };

  const allOrgs = await prisma.organization.findMany();
  for (const org of allOrgs) {
    const items = newsTemplates[org.name] || [
      `${org.name} shares an update with supporters.`,
      `${org.name} announces progress on initiatives.`,
    ];

    for (const title of items) {
      await prisma.newsItem.create({
        data: {
          title,
          content: `${title} — Read more at ${org.website}`,
          organizationId: org.id,
        },
      });
    }
  }

  console.log("✅ News items seeded.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
