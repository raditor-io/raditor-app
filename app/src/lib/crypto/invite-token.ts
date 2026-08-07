/**
 * Invitation tokens: a high-entropy secret in the emailed link; only its
 * SHA-256 hex digest is stored (organization_invitations.token_hash).
 */
import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes, base64url — safe for URLs, ~256 bits of entropy. */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
