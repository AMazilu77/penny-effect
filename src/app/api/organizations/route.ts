import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";

// Organizations a user can choose in the donation form: only active,
// verified ones (D-012).
export async function GET() {
  const organizations = await prisma.organization.findMany({
    where: VISIBLE_ORGANIZATION_WHERE,
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ organizations });
}
