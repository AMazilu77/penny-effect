// Rules for admin news posting (Milestone 2). Every news item must link to
// where the organization actually published it (NewsItem.sourceUrl); the feed
// shows nothing without one. Pure, so it can be unit-tested.
import { z } from "zod";
import { safeExternalUrl } from "@/lib/feed";

export const newsForm = z.object({
  organizationId: z.string().trim().min(1).max(64),
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(10).max(2000),
  sourceUrl: z
    .string()
    .trim()
    .max(2000)
    .transform((value, ctx) => {
      const url = safeExternalUrl(value);
      if (!url) {
        ctx.addIssue({ code: "custom", message: "Source must be an http(s) link" });
        return z.NEVER;
      }
      return url;
    }),
});

export type NewsInput = z.infer<typeof newsForm>;

/** Admins may post news only for organizations users can see (active and verified). */
export function canPostNewsFor(org: { status: "ACTIVE" | "HIDDEN"; verifiedAt: Date | null }): boolean {
  return org.status === "ACTIVE" && org.verifiedAt !== null;
}
