/**
 * ai_briefing prompt assembly + response validation. The radar's directive
 * is admin-authored configuration and enters the prompt as instructions by
 * design; everything derived from external content (known-signal titles)
 * goes through wrapUntrusted. Findings without at least one valid http(s)
 * evidence URL are dropped, never promoted — evidence is the contract.
 */
import { z } from "zod";

import type { ChatMessage } from "@/ai/types";
import { wrapUntrusted } from "@/ai/untrusted";
import { normalizeEvidenceUrl } from "@/radar/dedup";

export interface BriefingTarget {
  targetKind: string;
  repoFullName?: string | null;
  config?: unknown;
}

export interface KnownSignal {
  title: string;
  dedupKey: string | null;
  occurredAt: string;
}

export interface BriefingPromptInput {
  directiveMd: string;
  targets: BriefingTarget[];
  lastScannedAt: string | null;
  knownSignals: KnownSignal[];
  now: Date;
}

const FIRST_SCAN_WINDOW_DAYS = 7;

export const briefingEvidenceSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  publisher: z.string().optional(),
});

export const briefingFindingSchema = z.object({
  /** Participle+noun slug, e.g. price_changed, release_published. */
  kind: z
    .string()
    .min(1)
    .max(60)
    .transform((value) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
    ),
  title: z.string().min(1).max(300),
  summary_md: z.string().min(1).max(4_000),
  body_md: z.string().max(20_000).optional(),
  evidence: z.array(briefingEvidenceSchema).min(1),
  occurred_at: z.string().optional(),
});

export const briefingResponseSchema = z.object({
  summary_md: z.string().min(1).max(8_000),
  findings: z.array(briefingFindingSchema).default([]),
});

export type BriefingFinding = z.infer<typeof briefingFindingSchema>;
export type BriefingResponse = z.infer<typeof briefingResponseSchema>;

export function buildBriefingPrompt(input: BriefingPromptInput): ChatMessage[] {
  const sinceIso =
    input.lastScannedAt ??
    new Date(
      input.now.getTime() - FIRST_SCAN_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

  const system = [
    "You are a research radar. Search the live web for NEW developments on the mission below and report them as findings.",
    "",
    "Hard rules:",
    `- Only report developments that happened or became public after ${sinceIso}.`,
    "- Every finding MUST cite at least one source URL you actually found. Findings without a source URL are discarded.",
    "- Do not repeat anything from the ALREADY KNOWN list; those signals exist.",
    "- Nothing new is a valid result: return an empty findings array and explain what you checked in summary_md.",
    "",
    "Respond with ONLY a JSON object in exactly this shape:",
    "{",
    '  "summary_md": "2-6 sentences: what you checked and what you found (or why nothing was new)",',
    '  "findings": [',
    "    {",
    '      "kind": "participle_noun slug like price_changed, release_published, article_published",',
    '      "title": "one-line headline",',
    '      "summary_md": "2-4 sentence summary of the development",',
    '      "body_md": "optional longer briefing in markdown",',
    '      "evidence": [{ "url": "https://…", "title": "page title", "publisher": "site name" }],',
    '      "occurred_at": "ISO timestamp when the development happened, if known"',
    "    }",
    "  ]",
    "}",
  ].join("\n");

  const targetLines = input.targets
    .map((target) =>
      target.repoFullName
        ? `- GitHub repository: ${target.repoFullName}`
        : `- ${target.targetKind}`,
    )
    .join("\n");

  const knownDigest = input.knownSignals
    .map(
      (signal) =>
        `- ${signal.title} (${signal.dedupKey ?? "no key"}, ${signal.occurredAt})`,
    )
    .join("\n");

  const userParts = [
    `MISSION (from the radar's directive):\n${input.directiveMd}`,
  ];
  if (targetLines) {
    userParts.push(`WATCH HINTS (known targets of this radar):\n${targetLines}`);
  }
  if (knownDigest) {
    userParts.push(
      `ALREADY KNOWN (do not re-report):\n${wrapUntrusted(knownDigest, "known signal titles")}`,
    );
  }
  userParts.push(`Current time: ${input.now.toISOString()}`);

  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n\n") },
  ];
}

export interface ValidatedFindings {
  accepted: Array<
    BriefingFinding & { evidence: Array<{ url: string; title?: string; publisher?: string }> }
  >;
  droppedForMissingEvidence: number;
}

/**
 * Enforce the evidence contract: keep only findings with at least one valid
 * http(s) evidence URL (normalized), count the rest as dropped.
 */
export function validateFindings(
  response: BriefingResponse,
): ValidatedFindings {
  const accepted: ValidatedFindings["accepted"] = [];
  let dropped = 0;

  for (const finding of response.findings) {
    const evidence = finding.evidence
      .map((entry) => {
        const normalized = normalizeEvidenceUrl(entry.url);
        return normalized ? { ...entry, url: normalized } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    if (evidence.length === 0) {
      dropped += 1;
      continue;
    }
    accepted.push({ ...finding, evidence });
  }

  return { accepted, droppedForMissingEvidence: dropped };
}
