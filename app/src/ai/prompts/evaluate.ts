/**
 * Prompt builders + response schemas for radar v0 evaluation: a relevance
 * classification pass, then the four-part suggestion draft. Source-derived
 * text always arrives pre-wrapped via wrapUntrusted.
 */
import { z } from "zod";

import type { ChatMessage } from "@/ai/types";

export interface ProjectBriefing {
  displayName: string;
  siteType: string;
  purposeMd: string;
  doNotWriteMd: string;
  editorialMemoryMd: string;
  goals: Array<{ title: string; bodyMd: string }>;
}

export interface SignalContext {
  title: string;
  summaryMd: string;
  /** Already wrapped with wrapUntrusted by the caller. */
  wrappedEvidence: string;
}

function briefingBlock(project: ProjectBriefing): string {
  const goals = project.goals.length
    ? project.goals.map((g) => `- ${g.title}: ${g.bodyMd}`.trim()).join("\n")
    : "- (no explicit goals set)";
  return [
    `## Project: ${project.displayName} (site type: ${project.siteType})`,
    `### Purpose`,
    project.purposeMd || "(not written yet)",
    `### Active goals`,
    goals,
    `### Do-not-write policy (always overrides everything else)`,
    project.doNotWriteMd || "(none)",
    `### Editorial memory (learned preferences)`,
    project.editorialMemoryMd || "(none yet)",
  ].join("\n\n");
}

// --- Relevance classification -------------------------------------------------

export const relevanceResponseSchema = z.object({
  relevance_score: z.number().min(0).max(100),
  rationale: z.string(),
});
export type RelevanceResponse = z.infer<typeof relevanceResponseSchema>;

export const RELEVANCE_THRESHOLD = 55;

export function buildRelevanceMessages(
  personaMd: string,
  project: ProjectBriefing,
  signal: SignalContext,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are an editor agent for a static website, deciding whether an",
        "observed product signal warrants a content update for one specific",
        "project. Persona:",
        personaMd || "(no persona)",
        "",
        "Respond with strict JSON: {\"relevance_score\": 0-100, \"rationale\": \"one paragraph\"}.",
        "Score high only when the signal implies a user-visible change this",
        "project should cover, given its purpose, goals, and policies. The",
        "do-not-write policy always wins: score 0 for anything it forbids.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        briefingBlock(project),
        "",
        `## Signal: ${signal.title}`,
        signal.summaryMd,
        "",
        signal.wrappedEvidence,
      ].join("\n"),
    },
  ];
}

// --- Four-part suggestion draft -----------------------------------------------

export const graphImpactOperationSchema = z.object({
  op: z.enum(["create_page", "update_page", "update_section", "add_link"]),
  file_path: z.string().optional(),
  url_path: z.string().optional(),
  locale: z.string().optional(),
  title: z.string().optional(),
  marker_name: z.string().optional(),
  summary_of_change: z.string().optional(),
  from_url_path: z.string().optional(),
  to_url_path: z.string().optional(),
});

export const suggestionResponseSchema = z.object({
  title: z.string().min(1),
  signal_summary_md: z.string().min(1),
  recommendation_md: z.string().min(1),
  reason_md: z.string().min(1),
  graph_impact: z.object({
    operations: z.array(graphImpactOperationSchema),
  }),
});
export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;

export function buildSuggestionMessages(
  personaMd: string,
  project: ProjectBriefing,
  signal: SignalContext,
  relevanceRationale: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are an editor agent proposing one content suggestion for a",
        "static website project. Persona:",
        personaMd || "(no persona)",
        "",
        "Respond with strict JSON:",
        `{"title": "short imperative headline",`,
        ` "signal_summary_md": "what happened (evidence-backed)",`,
        ` "recommendation_md": "what should be built or updated",`,
        ` "reason_md": "why this matters for this project",`,
        ` "graph_impact": {"operations": [{"op": "create_page|update_page|update_section|add_link", "file_path": "...", "url_path": "...", "title": "...", "summary_of_change": "..."}]}}`,
        "",
        "Rules: every claim must trace to the evidence; never invent product",
        "behavior. Respect the do-not-write policy absolutely. Keep the",
        "suggestion reviewable: one focused change with at most a few graph",
        "operations. Markdown fields are short paragraphs, not essays.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        briefingBlock(project),
        "",
        `## Signal: ${signal.title}`,
        signal.summaryMd,
        "",
        signal.wrappedEvidence,
        "",
        `## Relevance assessment`,
        relevanceRationale,
      ].join("\n"),
    },
  ];
}
