/**
 * Validation for radar configuration fields: repo watch config and slug
 * derivation. Shared by server actions now and the public API later.
 */
import { z } from "zod";

export const watchConfigSchema = z.object({
  is_watching_releases: z.boolean().default(true),
  is_watching_default_branch_merges: z.boolean().default(true),
  is_watching_labeled_issues: z.boolean().default(false),
  issue_labels: z.array(z.string().min(1)).default([]),
  path_filters: z.array(z.string().min(1)).default([]),
});
export type WatchConfigInput = z.infer<typeof watchConfigSchema>;

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "radar"
  );
}
