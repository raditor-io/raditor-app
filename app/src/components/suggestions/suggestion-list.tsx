import { IconBulb } from "@tabler/icons-react";
import Link from "next/link";

import type { SuggestionRow } from "@/services/suggestion";

const STATUS_STYLES: Record<string, string> = {
  open: "text-accent border-accent/40",
  elaborated: "text-accent border-accent/40",
  accepted: "text-success border-success/40",
  dismissed: "text-faint border-border",
  expired: "text-faint border-border",
};

/** Vercel-style row list of suggestions; optionally shows the project name. */
export function SuggestionList({
  suggestions,
  projectNames,
}: {
  suggestions: SuggestionRow[];
  /** id → display name; row shows a project chip when provided. */
  projectNames?: Record<string, string>;
}) {
  return (
    <ul className="space-y-2">
      {suggestions.map((suggestion) => (
        <li key={suggestion.id}>
          <Link
            href={`/projects/${suggestion.project_id}/content/${suggestion.id}`}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <IconBulb size={18} stroke={1.75} className="shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {suggestion.title || "Untitled suggestion"}
                </span>
                <span className="block truncate text-xs text-faint">
                  {projectNames?.[suggestion.project_id]
                    ? `${projectNames[suggestion.project_id]} · `
                    : ""}
                  {new Date(suggestion.created_at).toLocaleString()}
                  {suggestion.relevance_score !== null
                    ? ` · relevance ${suggestion.relevance_score}`
                    : ""}
                </span>
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLES[suggestion.status] ?? "text-muted border-border"}`}
            >
              {suggestion.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
