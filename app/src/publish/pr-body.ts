/**
 * PR body builder: the four-part suggestion shape plus evidence links and
 * the attribution badge (the PR is the billboard, PROJECT.md §14). Pure and
 * snapshot-tested.
 */

export interface PrBodyInput {
  signalSummaryMd: string;
  recommendationMd: string;
  reasonMd: string;
  evidence: Array<{ title?: string | null; url?: string | null }>;
  filePaths: string[];
}

export function buildPrBody(input: PrBodyInput): string {
  const evidenceLines = input.evidence
    .filter((e) => e.url || e.title)
    .map((e) => (e.url ? `- [${e.title ?? e.url}](${e.url})` : `- ${e.title}`));

  return [
    "## Signal",
    input.signalSummaryMd.trim(),
    "",
    "## Recommendation",
    input.recommendationMd.trim(),
    "",
    "## Reason",
    input.reasonMd.trim(),
    "",
    "## Files",
    ...input.filePaths.map((p) => `- \`${p}\``),
    ...(evidenceLines.length > 0 ? ["", "## Evidence", ...evidenceLines] : []),
    "",
    "---",
    "*Proposed by [Raditor](https://raditor.io), the agentic CMS. Reviewed and accepted by a human before this PR was opened.*",
  ].join("\n");
}
