import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { openSecret, sealSecret } from "./secret-box";

const KEY = randomBytes(32).toString("base64");

describe("secret-box", () => {
  it("roundtrips a secret", () => {
    const sealed = sealSecret("whsec_super-secret", KEY);
    expect(sealed.ciphertext).not.toContain("super-secret");
    expect(openSecret(sealed, KEY)).toBe("whsec_super-secret");
  });

  it("produces distinct ciphertexts per call (random iv)", () => {
    const a = sealSecret("same", KEY);
    const b = sealSecret("same", KEY);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("throws on tampered ciphertext", () => {
    const sealed = sealSecret("payload", KEY);
    const bytes = Buffer.from(sealed.ciphertext, "base64");
    bytes[0] ^= 0xff;
    expect(() =>
      openSecret({ ...sealed, ciphertext: bytes.toString("base64") }, KEY),
    ).toThrow();
  });

  it("throws on a wrong-length key", () => {
    const shortKey = randomBytes(16).toString("base64");
    expect(() => sealSecret("x", shortKey)).toThrow(/32 bytes/);
  });
});
