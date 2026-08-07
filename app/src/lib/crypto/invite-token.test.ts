import { describe, expect, it } from "vitest";

import { generateInviteToken, hashInviteToken } from "./invite-token";

describe("invite tokens", () => {
  it("generates url-safe tokens with fresh entropy", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
  });

  it("hashes deterministically to sha256 hex", () => {
    const token = "fixed-token";
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken("other")).not.toBe(hashInviteToken(token));
  });
});
