import { describe, expect, it } from "vitest";

import { wrapUntrusted } from "./untrusted";

describe("wrapUntrusted", () => {
  it("fences the text with boundary markers and a data preamble", () => {
    const wrapped = wrapUntrusted("release notes here", "release body");
    expect(wrapped).toContain("release notes here");
    expect(wrapped).toContain("untrusted DATA");
    expect(wrapped).toMatch(/<<<UNTRUSTED_[A-Za-z0-9_-]+>>>/);
    expect(wrapped).toMatch(/<<<END UNTRUSTED_[A-Za-z0-9_-]+>>>/);
  });

  it("uses a fresh boundary per call", () => {
    const a = wrapUntrusted("x");
    const b = wrapUntrusted("x");
    const boundaryA = a.match(/UNTRUSTED_[A-Za-z0-9_-]+/)?.[0];
    const boundaryB = b.match(/UNTRUSTED_[A-Za-z0-9_-]+/)?.[0];
    expect(boundaryA).toBeDefined();
    expect(boundaryA).not.toBe(boundaryB);
  });
});
