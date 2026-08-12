import { describe, expect, it } from "vitest";

import {
  apiTokenPrefix,
  generateApiToken,
  hashApiToken,
  isApiToken,
} from "./api-token";

describe("api-token", () => {
  it("generates rad_-prefixed, high-entropy, unique tokens", () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a).toMatch(/^rad_[A-Za-z0-9_-]{40,}$/);
    expect(a).not.toBe(b);
  });

  it("hashes stably to sha256 hex", () => {
    const token = "rad_fixed";
    expect(hashApiToken(token)).toBe(hashApiToken(token));
    expect(hashApiToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiToken(token)).not.toBe(hashApiToken("rad_other"));
  });

  it("derives a 12-char display prefix", () => {
    const token = generateApiToken();
    expect(apiTokenPrefix(token)).toHaveLength(12);
    expect(token.startsWith(apiTokenPrefix(token))).toBe(true);
  });

  it("recognizes token-shaped values", () => {
    expect(isApiToken(generateApiToken())).toBe(true);
    expect(isApiToken("whsec_x")).toBe(false);
    expect(isApiToken("rad_")).toBe(false);
  });
});
