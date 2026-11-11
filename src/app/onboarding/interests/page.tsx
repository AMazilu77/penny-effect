import { prisma } from "@/lib/prisma";
import { InterestsForm } from "./InterestsForm";

// Server Component: loads the real cause categories from the database, then
// hands them to the interactive form (a Client Component). The form sends
// back category ids, which the API checks against the same table.
export const dynamic = "force-dynamic";

export default async function OnboardingInterestsPage() {
  const categories = await prisma.causeCategory.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });

  return <InterestsForm categories={categories} />;
}
