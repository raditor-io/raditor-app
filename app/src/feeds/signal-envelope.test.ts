import { describe, expect, it } from "vitest";

import { buildSignalEnvelope } from "./signal-envelope";

describe("buildSignalEnvelope", () => {
  it("projects exactly the standard envelope fields", () => {
    const envelope = buildSignalEnvelope({
      id: "sig-1",
      radar_id: "radar-1",
      kind: "release_published",
      title: "Release v2",
      summary_md: "Version 2 shipped.",
      body_md: "Full notes.",
      evidence: [{ url: "https://example.com/release" }],
      occurred_at: "2026-08-12T08:00:00.000Z",
    });

    expect(envelope).toEqual({
      id: "sig-1",
      radar_id: "radar-1",
      kind: "release_published",
      title: "Release v2",
      summary_md: "Version 2 shipped.",
      body_md: "Full notes.",
      evidence: [{ url: "https://example.com/release" }],
      occurred_at: "2026-08-12T08:00:00.000Z",
    });
  });

  it("normalizes non-array evidence to an empty array", () => {
    const envelope = buildSignalEnvelope({
      id: "s",
      radar_id: "r",
      kind: "k",
      title: "t",
      summary_md: "s",
      body_md: "",
      evidence: null,
      occurred_at: "2026-08-12T08:00:00.000Z",
    });
    expect(envelope.evidence).toEqual([]);
  });
});
