import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ organizations });
}
