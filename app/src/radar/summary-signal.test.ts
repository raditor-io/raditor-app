import { describe, expect, it } from "vitest";

import {
  buildSummarySignalOutput,
  SCAN_SUMMARY_OUTPUT_KIND,
} from "./summary-signal";

describe("buildSummarySignalOutput", () => {
  const input = {
    organizationId: "org-1",
    radarId: "radar-1",
    scanId: "scan-1",
    summaryMd: "Checked 4 sources; nothing new.",
    now: new Date("2026-08-13T16:31:36Z"),
  };

  it("keys identity on the scan id so each scan yields one distinct signal", () => {
    const row = buildSummarySignalOutput(input);
    expect(row.external_ref).toBe("scan_summary:scan-1");
    expect(row.data).toEqual({ dedup_key: "scan_summary:scan-1" });
    const other = buildSummarySignalOutput({ ...input, scanId: "scan-2" });
    expect(other.external_ref).not.toBe(row.external_ref);
  });

  it("carries the summary as body under a timestamped title", () => {
    const row = buildSummarySignalOutput(input);
    expect(row.output_kind).toBe(SCAN_SUMMARY_OUTPUT_KIND);
    expect(row.title).toBe("Scan summary 2026-08-13 16:31 UTC");
    expect(row.body).toBe("Checked 4 sources; nothing new.");
    expect(row.occurred_at).toBe("2026-08-13T16:31:36.000Z");
    expect(row.url).toBeNull();
  });
});
