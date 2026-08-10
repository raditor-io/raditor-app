/**
 * Signed state for the GitHub App connect flow: proves the setup callback
 * belongs to the org/admin who started the install. HMAC SHA-256 with the
 * app-wide server secret, base64url payload, 1 hour validity.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface ConnectState {
  organizationId: string;
  userId: string;
  /** Same-origin path to return to after the installation is stored. */
  returnTo: string;
  expiresAtMs: number;
}

const STATE_TTL_MS = 60 * 60 * 1000;

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

export function signConnectState(
  input: Omit<ConnectState, "expiresAtMs">,
  secret: string,
  nowMs = Date.now(),
): string {
  const state: ConnectState = { ...input, expiresAtMs: nowMs + STATE_TTL_MS };
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifyConnectState(
  token: string,
  secret: string,
  nowMs = Date.now(),
): ConnectState | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = hmac(payload, secret);
  if (signature.length !== expected.length) return null;
  if (
    !timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"))
  ) {
    return null;
  }

  let state: ConnectState;
  try {
    state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof state.expiresAtMs !== "number" || state.expiresAtMs < nowMs) {
    return null;
  }
  if (!state.returnTo?.startsWith("/") || state.returnTo.startsWith("//")) {
    return null;
  }
  return state;
}
