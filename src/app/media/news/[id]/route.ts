// A news item's image, by news id. Only for items the feed can show
// (a source link, and an organization donors can see).
import { notFound, serveStoredImage } from "@/lib/media";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return notFound();
  const item = await prisma.newsItem.findFirst({
    where: { id, sourceUrl: { not: null }, organization: VISIBLE_ORGANIZATION_WHERE },
    select: { imageUrl: true },
  });
  return serveStoredImage(item?.imageUrl ?? null);
}
