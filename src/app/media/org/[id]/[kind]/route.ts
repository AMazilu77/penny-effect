// An organization's logo or cover image (copied from Every.org), by org id.
// Only for organizations donors can see.
import { notFound, serveStoredImage } from "@/lib/media";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id) || (kind !== "logo" && kind !== "cover")) return notFound();
  const org = await prisma.organization.findFirst({
    where: { id, ...VISIBLE_ORGANIZATION_WHERE },
    select: { logoUrl: true, coverImageUrl: true },
  });
  return serveStoredImage(kind === "logo" ? (org?.logoUrl ?? null) : (org?.coverImageUrl ?? null));
}
