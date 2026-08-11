import { describe, expect, it } from "vitest";

import { buildPrBody } from "./pr-body";

describe("buildPrBody", () => {
  it("renders the four parts, files, evidence, and attribution", () => {
    const body = buildPrBody({
      signalSummaryMd: "v2 shipped.",
      recommendationMd: "Announce it.",
      reasonMd: "Users should know.",
      evidence: [
        { title: "Release v2", url: "https://github.com/a/b/releases/v2" },
        { title: "no-url evidence", url: null },
      ],
      filePaths: ["content/blog/v2.mdx"],
    });
    expect(body).toContain("## Signal\nv2 shipped.");
    expect(body).toContain("## Recommendation\nAnnounce it.");
    expect(body).toContain("## Reason\nUsers should know.");
    expect(body).toContain("- `content/blog/v2.mdx`");
    expect(body).toContain("[Release v2](https://github.com/a/b/releases/v2)");
    expect(body).toContain("- no-url evidence");
    expect(body).toContain("Proposed by [Raditor](https://raditor.io)");
  });

  it("omits the evidence section when empty", () => {
    const body = buildPrBody({
      signalSummaryMd: "s",
      recommendationMd: "r",
      reasonMd: "w",
      evidence: [],
      filePaths: ["docs/a.md"],
    });
    expect(body).not.toContain("## Evidence");
  });
});
