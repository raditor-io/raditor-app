import { describe, expect, it } from "vitest";

import { deriveDedupKey, normalizeEvidenceUrl } from "./dedup";

describe("normalizeEvidenceUrl", () => {
  it("lowercases host and strips www, fragment, trailing slash", () => {
    expect(
      normalizeEvidenceUrl("https://WWW.Example.com/Blog/Post/#section"),
    ).toBe("https://example.com/Blog/Post");
  });

  it("strips tracking params and sorts the rest", () => {
    expect(
      normalizeEvidenceUrl(
        "https://example.com/p?utm_source=x&b=2&a=1&fbclid=abc",
      ),
    ).toBe("https://example.com/p?a=1&b=2");
  });

  it("collapses http/https and default ports onto one identity", () => {
    expect(normalizeEvidenceUrl("http://example.com:80/a/")).toBe(
      "https://example.com/a",
    );
  });

  it("returns null for non-http(s) or unparseable input", () => {
    expect(normalizeEvidenceUrl("ftp://example.com/a")).toBeNull();
    expect(normalizeEvidenceUrl("not a url")).toBeNull();
    expect(normalizeEvidenceUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("deriveDedupKey", () => {
  it("keys repo-target outputs on repo, kind, and external ref", () => {
    expect(
      deriveDedupKey({
        outputKind: "release_published",
        externalRef: "release:v1.2.0",
        repoFullName: "acme/product",
      }),
    ).toBe("acme/product:release_published:release:v1.2.0");
  });

  it("keys briefing findings on the normalized primary URL", () => {
    expect(
      deriveDedupKey({
        outputKind: "price_changed",
        externalRef: "whatever",
        url: "https://www.example.com/pricing/?utm_campaign=x",
      }),
    ).toBe("briefing:https://example.com/pricing");
  });

  it("falls back to the external ref when no repo and no usable URL", () => {
    expect(
      deriveDedupKey({
        outputKind: "article_published",
        externalRef: "some-ref",
        url: "not a url",
      }),
    ).toBe("url:some-ref");
  });
});
