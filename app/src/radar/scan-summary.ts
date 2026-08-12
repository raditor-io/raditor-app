/**
 * Deterministic scan summaries: every scan records what happened, including
 * zero-signal scans, without spending an extra AI call. Briefing scans embed
 * the model's own summary; inbox scans get a templated digest.
 */

export interface ScanSummaryInput {
  strategiesUsed: string[];
  stats: {
    events_consumed: number;
    outputs_created: number;
    signals_created: number;
    briefing_findings_dropped?: number;
    feed_items_created?: number;
  };
  signalTitles: string[];
  briefingSummaryMd?: string | null;
  warnings?: string[];
}

export function buildScanSummary(input: ScanSummaryInput): string {
  const lines: string[] = [];

  if (input.strategiesUsed.includes("target_emitted_events")) {
    if (input.stats.events_consumed > 0) {
      lines.push(
        `Consumed ${input.stats.events_consumed} target event${
          input.stats.events_consumed === 1 ? "" : "s"
        } from the inbox.`,
      );
    } else {
      lines.push("Inbox was empty; no target events to consume.");
    }
  }

  if (input.briefingSummaryMd) {
    lines.push(input.briefingSummaryMd.trim());
  }

  if (input.stats.signals_created > 0) {
    const titles = input.signalTitles.slice(0, 5).join("; ");
    lines.push(
      `Signals (${input.stats.signals_created}): ${titles}${
        input.signalTitles.length > 5 ? "; …" : ""
      }`,
    );
  } else {
    lines.push("No new signals.");
  }

  if (
    input.stats.briefing_findings_dropped &&
    input.stats.briefing_findings_dropped > 0
  ) {
    lines.push(
      `Dropped ${input.stats.briefing_findings_dropped} finding${
        input.stats.briefing_findings_dropped === 1 ? "" : "s"
      } without source URLs.`,
    );
  }

  for (const warning of input.warnings ?? []) {
    lines.push(`Warning: ${warning}`);
  }

  return lines.join("\n\n");
}
