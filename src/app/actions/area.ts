"use server";
// "Save as my area" on Discover (local nonprofits, D-028). A plain form, so
// it works without JavaScript. Like every Server Action it's a public POST
// endpoint under the hood, so it checks the session, validates the input
// with the same schema as PUT /api/profile/area, rate-limits per user and
// only redirects to our own pages.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { myAreaSchema } from "@/lib/area";
import { saveMyArea } from "@/lib/area-store";
import { safeReturnPath, withNotice } from "@/lib/follows";
import { rateLimit, RULES } from "@/lib/rate-limit";
import { prismaRateLimitStore } from "@/lib/rate-limit-store";

/** Reads the form's fields into the My area shape (unknown kinds fail validation). */
function formToArea(formData: FormData) {
  const kind = formData.get("kind");
  if (kind === "region") return { kind, regionSlug: formData.get("regionSlug") };
  if (kind === "city") return { kind, state: formData.get("state"), city: formData.get("city") };
  return { kind };
}

export async function saveAreaFromDiscover(formData: FormData) {
  const back = safeReturnPath(formData.get("returnTo"));
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect(`/signin?callbackUrl=${encodeURIComponent(back)}`);

  const input = myAreaSchema.safeParse(formToArea(formData));
  if (!input.success || input.data.kind === "none") redirect(withNotice(back, "area-invalid"));

  const limited = await rateLimit(prismaRateLimitStore, [{ rule: RULES.profileUser, identifier: userId }]);
  if (!limited.ok) redirect(withNotice(back, "area-limited"));

  const saved = await saveMyArea(userId, input.data);
  if (!saved.ok) redirect(withNotice(back, "area-invalid"));

  for (const path of ["/feed", "/discover", "/profile"]) revalidatePath(path);
  redirect(withNotice(back, "area-saved"));
}
