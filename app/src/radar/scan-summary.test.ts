import { describe, expect, it } from "vitest";

import { buildScanSummary } from "./scan-summary";

describe("buildScanSummary", () => {
  it("summarizes a zero-signal scan with real content", () => {
    const summary = buildScanSummary({
      strategiesUsed: ["target_emitted_events"],
      stats: { events_consumed: 0, outputs_created: 0, signals_created: 0 },
      signalTitles: [],
    });
    expect(summary).toContain("Inbox was empty");
    expect(summary).toContain("No new signals.");
  });

  it("embeds the briefing summary and lists signal titles", () => {
    const summary = buildScanSummary({
      strategiesUsed: ["ai_briefing"],
      stats: {
        events_consumed: 0,
        outputs_created: 2,
        signals_created: 2,
        briefing_findings_dropped: 1,
      },
      signalTitles: ["Competitor dropped prices", "New plan launched"],
      briefingSummaryMd: "Checked 4 pricing pages; found 2 changes.",
    });
    expect(summary).toContain("Checked 4 pricing pages");
    expect(summary).toContain(
      "Signals (2): Competitor dropped prices; New plan launched",
    );
    expect(summary).toContain("Dropped 1 finding without source URLs.");
  });

  it("counts consumed events and appends warnings", () => {
    const summary = buildScanSummary({
      strategiesUsed: ["target_emitted_events"],
      stats: { events_consumed: 3, outputs_created: 3, signals_created: 1 },
      signalTitles: ["Release v2"],
      warnings: ["web search degraded"],
    });
    expect(summary).toContain("Consumed 3 target events");
    expect(summary).toContain("Warning: web search degraded");
  });

  it("truncates long signal lists", () => {
    const summary = buildScanSummary({
      strategiesUsed: ["ai_briefing"],
      stats: { events_consumed: 0, outputs_created: 6, signals_created: 6 },
      signalTitles: ["a", "b", "c", "d", "e", "f"],
    });
    expect(summary).toContain("; …");
  });
});
