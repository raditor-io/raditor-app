import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyGithubSignature } from "./webhook-verify";

const SECRET = "test-webhook-secret";

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

describe("verifyGithubSignature", () => {
  const body = JSON.stringify({ action: "published" });

  it("accepts a valid signature", () => {
    expect(verifyGithubSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyGithubSignature(body + " ", sign(body), SECRET)).toBe(false);
  });

  it("rejects a signature from the wrong secret", () => {
    expect(verifyGithubSignature(body, sign(body, "other"), SECRET)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyGithubSignature(body, null, SECRET)).toBe(false);
    expect(verifyGithubSignature(body, "sha1=abc", SECRET)).toBe(false);
    expect(verifyGithubSignature(body, "sha256=zz", SECRET)).toBe(false);
  });
});
