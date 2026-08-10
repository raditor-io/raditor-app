/**
 * Validation for project configuration fields: URL mapping rules,
 * deploy path allowlist, and source watch config. Shared by server actions
 * now and the public API later.
 */
import { z } from "zod";

/** One URL mapping rule: `content/blog/*.mdx` → `/blog/{slug}` (ordered, first match wins). */
export const urlMappingRuleSchema = z.object({
  pattern: z
    .string()
    .min(1)
    .refine((p) => !p.startsWith("/") && !p.includes(".."), {
      message: "Pattern must be repo-relative without '..'",
    }),
  url: z
    .string()
    .min(1)
    .refine((u) => u.startsWith("/"), {
      message: "URL must start with '/'",
    }),
});

export const urlMappingConfigSchema = z.array(urlMappingRuleSchema);
export type UrlMappingConfig = z.infer<typeof urlMappingConfigSchema>;

/** Repo-relative folder/glob entries where Raditor may write. */
export const pathAllowlistSchema = z
  .array(
    z
      .string()
      .min(1)
      .refine((p) => !p.startsWith("/") && !p.includes("..") && !p.includes("\\"), {
        message: "Allowlist entries must be repo-relative without '..'",
      }),
  )
  .min(0);

/** Parse a textarea (one entry per line) into a clean allowlist. */
export function parseAllowlistLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export const watchConfigSchema = z.object({
  is_watching_releases: z.boolean().default(true),
  is_watching_default_branch_merges: z.boolean().default(true),
  is_watching_labeled_issues: z.boolean().default(false),
  issue_labels: z.array(z.string().min(1)).default([]),
  path_filters: z.array(z.string().min(1)).default([]),
});
export type WatchConfigInput = z.infer<typeof watchConfigSchema>;

export const SITE_TYPES = [
  "general",
  "blog",
  "help_center",
  "documentation",
] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export const SUGGESTION_INTERVALS = ["daily", "weekly", "monthly"] as const;

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "project"
  );
}
