import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ organizations });
}
