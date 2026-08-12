import { describe, expect, it } from "vitest";

import {
  briefingResponseSchema,
  buildBriefingPrompt,
  validateFindings,
} from "./briefing";

const BASE_INPUT = {
  directiveMd: "Watch competitor pricing pages for changes.",
  targets: [
    { targetKind: "github_repo", repoFullName: "acme/product" },
    { targetKind: "website_url" },
  ],
  lastScannedAt: "2026-08-10T00:00:00.000Z",
  knownSignals: [
    {
      title: "Acme raised Pro plan to $49",
      dedupKey: "briefing:https://acme.com/pricing",
      occurredAt: "2026-08-09T12:00:00.000Z",
    },
  ],
  now: new Date("2026-08-12T08:00:00.000Z"),
};

describe("buildBriefingPrompt", () => {
  it("includes the directive, targets, known digest, and since-bound", () => {
    const messages = buildBriefingPrompt(BASE_INPUT);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("2026-08-10T00:00:00.000Z");
    const user = messages[1].content;
    expect(user).toContain("Watch competitor pricing pages");
    expect(user).toContain("acme/product");
    expect(user).toContain("Acme raised Pro plan to $49");
    expect(user).toContain("Current time: 2026-08-12T08:00:00.000Z");
  });

  it("fences the known-signals digest as untrusted data", () => {
    const messages = buildBriefingPrompt(BASE_INPUT);
    // wrapUntrusted emits an UNTRUSTED_<nonce> boundary around the digest.
    expect(messages[1].content).toMatch(/UNTRUSTED_[A-Za-z0-9_-]+/);
  });

  it("falls back to a 7-day window on the first scan", () => {
    const messages = buildBriefingPrompt({ ...BASE_INPUT, lastScannedAt: null });
    expect(messages[0].content).toContain("2026-08-05T08:00:00.000Z");
  });
});

describe("briefingResponseSchema", () => {
  it("normalizes finding kinds to participle_noun slugs", () => {
    const parsed = briefingResponseSchema.parse({
      summary_md: "Checked pricing pages.",
      findings: [
        {
          kind: "Price Changed!",
          title: "Competitor dropped prices",
          summary_md: "Prices dropped.",
          evidence: [{ url: "https://example.com/pricing" }],
        },
      ],
    });
    expect(parsed.findings[0].kind).toBe("price_changed");
  });

  it("rejects findings without evidence", () => {
    expect(() =>
      briefingResponseSchema.parse({
        summary_md: "x",
        findings: [
          { kind: "a", title: "t", summary_md: "s", evidence: [] },
        ],
      }),
    ).toThrow();
  });
});

describe("validateFindings", () => {
  it("drops findings whose evidence URLs are all invalid and counts them", () => {
    const { accepted, droppedForMissingEvidence } = validateFindings({
      summary_md: "x",
      findings: [
        {
          kind: "price_changed",
          title: "Real finding",
          summary_md: "s",
          evidence: [{ url: "https://www.example.com/pricing/" }],
        },
        {
          kind: "price_changed",
          title: "Hallucinated finding",
          summary_md: "s",
          evidence: [{ url: "not a url" }],
        },
      ],
    });
    expect(accepted).toHaveLength(1);
    expect(accepted[0].evidence[0].url).toBe("https://example.com/pricing");
    expect(droppedForMissingEvidence).toBe(1);
  });
});
