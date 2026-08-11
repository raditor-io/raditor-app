/**
 * Prompt builder for content_draft: turn one graph-impact file operation of
 * an accepted suggestion into a complete markdown/MDX file with frontmatter.
 * The full SEO/AEO publish bar hardens in Phase 6; this is the honest v1.
 */
import type { ChatMessage } from "@/ai/types";
import type { ProjectBriefing } from "@/ai/prompts/evaluate";

export interface DraftFileOperation {
  op: string;
  file_path?: string;
  url_path?: string;
  title?: string;
  summary_of_change?: string;
}

export function buildDraftMessages(input: {
  personaMd: string;
  project: ProjectBriefing;
  suggestion: {
    title: string;
    signalSummaryMd: string;
    recommendationMd: string;
    reasonMd: string;
  };
  operation: DraftFileOperation;
  wrappedEvidence: string;
  /** Existing file content for update_page operations (already trusted-wrapped). */
  wrappedExistingContent?: string;
  todayIso: string;
}): ChatMessage[] {
  const { operation } = input;
  return [
    {
      role: "system",
      content: [
        "You are an editor agent writing the actual file content for an",
        "accepted content suggestion on a static website. Persona:",
        input.personaMd || "(no persona)",
        "",
        "Respond with the COMPLETE file content and nothing else: YAML",
        "frontmatter first (title, description, date), then clean semantic",
        "markdown. One clear H1. Every claim must trace to the evidence;",
        "never invent product behavior. Respect the do-not-write policy",
        "absolutely. No placeholder text, no TODO markers.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `## Project: ${input.project.displayName} (${input.project.siteType})`,
        input.project.purposeMd || "(no purpose written)",
        `### Do-not-write policy`,
        input.project.doNotWriteMd || "(none)",
        "",
        `## Accepted suggestion: ${input.suggestion.title}`,
        `Signal: ${input.suggestion.signalSummaryMd}`,
        `Recommendation: ${input.suggestion.recommendationMd}`,
        `Reason: ${input.suggestion.reasonMd}`,
        "",
        `## File operation`,
        `${operation.op}: ${operation.file_path ?? "(path pending)"}`,
        operation.url_path ? `URL: ${operation.url_path}` : "",
        operation.title ? `Working title: ${operation.title}` : "",
        operation.summary_of_change
          ? `Intended change: ${operation.summary_of_change}`
          : "",
        `Date for frontmatter: ${input.todayIso}`,
        "",
        input.wrappedEvidence,
        ...(input.wrappedExistingContent
          ? [
              "",
              "## Existing file content (update it; keep unrelated sections intact)",
              input.wrappedExistingContent,
            ]
          : []),
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
}

/** Strip a markdown code fence if the model wrapped the whole file in one. */
export function unfenceFileContent(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n```$/);
  return match?.[1] ?? trimmed;
}
