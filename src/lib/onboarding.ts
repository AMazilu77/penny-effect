import { z } from "zod";

// Request body for POST /api/onboarding/interests.
// The client sends the ids of existing CauseCategory rows; the API never
// creates categories from user input.
export const interestsRequestSchema = z.object({
  categoryIds: z
    .array(z.string().trim().min(1).max(64))
    .min(1, "Pick at least one cause.")
    .max(50)
    // Duplicates are harmless; drop them so they can't skew the "unknown id" check.
    .transform((ids) => Array.from(new Set(ids))),
});

export type InterestsRequest = z.infer<typeof interestsRequestSchema>;

/** Ids in `requested` that are not in `existing` (empty when all are valid). */
export function findUnknownIds(requested: readonly string[], existing: readonly string[]): string[] {
  const known = new Set(existing);
  return requested.filter((id) => !known.has(id));
}
