import { describe, expect, it } from "vitest";

import {
  MAX_KEYWORDS_PER_LIST,
  parseKeywordList,
  passesKeywordFilters,
} from "@/feeds/keyword-filter";

describe("parseKeywordList", () => {
  it("splits on commas, trims, and drops empties", () => {
    expect(parseKeywordList(" pricing ,  launch ,, ")).toEqual([
      "pricing",
      "launch",
    ]);
  });

  it("dedupes case-insensitively, keeping the first spelling", () => {
    expect(parseKeywordList("AI, ai, Ai")).toEqual(["AI"]);
  });

  it("caps the list length", () => {
    const raw = Array.from({ length: 30 }, (_, i) => `kw${i}`).join(",");
    expect(parseKeywordList(raw)).toHaveLength(MAX_KEYWORDS_PER_LIST);
  });

  it("returns empty for empty input", () => {
    expect(parseKeywordList("")).toEqual([]);
  });
});

describe("passesKeywordFilters", () => {
  const none = { mustIncludeKeywords: null, mutedKeywords: null };

  it("passes everything when both lists are empty", () => {
    expect(passesKeywordFilters("Anything at all", none)).toBe(true);
  });

  it("requires at least one must-include match (OR semantics)", () => {
    const filters = {
      mustIncludeKeywords: ["pricing", "launch"],
      mutedKeywords: null,
    };
    expect(passesKeywordFilters("New pricing tier announced", filters)).toBe(
      true,
    );
    expect(passesKeywordFilters("Unrelated blog post", filters)).toBe(false);
  });

  it("matches case-insensitively", () => {
    const filters = { mustIncludeKeywords: ["PRICING"], mutedKeywords: null };
    expect(passesKeywordFilters("pricing changed", filters)).toBe(true);
  });

  it("matches single words on word boundaries", () => {
    const filters = { mustIncludeKeywords: ["ai"], mutedKeywords: null };
    expect(passesKeywordFilters("New AI features shipped", filters)).toBe(true);
    expect(passesKeywordFilters("How to maintain the garden", filters)).toBe(
      false,
    );
  });

  it("matches multi-word keywords as phrases across whitespace", () => {
    const filters = {
      mustIncludeKeywords: ["price increase"],
      mutedKeywords: null,
    };
    expect(
      passesKeywordFilters("Vendor announced a price\nincrease today", filters),
    ).toBe(true);
    expect(
      passesKeywordFilters("Price talks and an increase in demand", filters),
    ).toBe(false);
  });

  it("drops any muted match, and mute wins over must-include", () => {
    const filters = {
      mustIncludeKeywords: ["pricing"],
      mutedKeywords: ["rumor"],
    };
    expect(
      passesKeywordFilters("Pricing rumor circulating widely", filters),
    ).toBe(false);
    expect(passesKeywordFilters("Pricing update confirmed", filters)).toBe(
      true,
    );
  });

  it("escapes regex special characters in keywords", () => {
    const filters = { mustIncludeKeywords: ["c++"], mutedKeywords: null };
    expect(passesKeywordFilters("Modern C++ release notes", filters)).toBe(
      true,
    );
    expect(passesKeywordFilters("Plain c release notes", filters)).toBe(false);
  });
});
