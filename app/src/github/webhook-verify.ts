/**
 * GitHub webhook signature verification: HMAC SHA-256 of the raw body with
 * the app's webhook secret, compared timing-safe against the
 * x-hub-signature-256 header ("sha256=<hex>").
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(
    Buffer.from(provided, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}
