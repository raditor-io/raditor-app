/**
 * API tokens for pulled_feed subscriptions: a high-entropy bearer secret
 * shown once at creation; only its SHA-256 hex digest is stored
 * (subscriptions.api_token_hash), plus a short display prefix so users can
 * tell tokens apart. Mirrors the invite-token pattern.
 */
import { createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "rad_";
const DISPLAY_PREFIX_LENGTH = 12;

/** `rad_` + 32 random bytes base64url (~256 bits of entropy). */
export function generateApiToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** First characters of the full token, for display in subscription lists. */
export function apiTokenPrefix(token: string): string {
  return token.slice(0, DISPLAY_PREFIX_LENGTH);
}

export function isApiToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX) && value.length > TOKEN_PREFIX.length;
}
