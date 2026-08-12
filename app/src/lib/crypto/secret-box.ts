/**
 * Minimal AES-256-GCM secret sealing for values we must read back later
 * (webhook signing secrets). Key: VAULT_MASTER_KEY (32 bytes base64,
 * server-only). Column shape matches provider_credentials: base64 ciphertext
 * (auth tag appended) + base64 iv. Server-only module; sealed values never
 * reach the client bundle or logs.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { requireEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export interface SealedSecret {
  ciphertext: string;
  iv: string;
}

function resolveKey(masterKeyBase64?: string): Buffer {
  const raw =
    masterKeyBase64 ?? requireEnv("VAULT_MASTER_KEY").VAULT_MASTER_KEY;
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `VAULT_MASTER_KEY must be ${KEY_BYTES} bytes base64 (got ${key.length})`,
    );
  }
  return key;
}

export function sealSecret(
  plaintext: string,
  masterKeyBase64?: string,
): SealedSecret {
  const key = resolveKey(masterKeyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const withTag = Buffer.concat([encrypted, cipher.getAuthTag()]);
  return { ciphertext: withTag.toString("base64"), iv: iv.toString("base64") };
}

export function openSecret(
  sealed: SealedSecret,
  masterKeyBase64?: string,
): string {
  const key = resolveKey(masterKeyBase64);
  const iv = Buffer.from(sealed.iv, "base64");
  const withTag = Buffer.from(sealed.ciphertext, "base64");
  const tag = withTag.subarray(withTag.length - 16);
  const encrypted = withTag.subarray(0, withTag.length - 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
