import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgs = [
    {
      name: 'World Food Programme',
      description: 'Fighting hunger worldwide.',
      website: 'https://www.wfp.org',
      logoUrl: '/logos/wfp.png'
    },
    {
      name: 'Doctors Without Borders',
      description: 'Providing medical care in crisis zones.',
      website: 'https://www.doctorswithoutborders.org',
      logoUrl: '/logos/msf.png'
    },
  ];

  for (const org of orgs) {
    await prisma.organization.upsert({
      where: { name: org.name },
      update: {},
      create: org,
    });
  }
}

main()
  .then(() => console.log('Seeded organizations'))
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
