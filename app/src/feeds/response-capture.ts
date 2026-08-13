/**
 * Bounded capture of a webhook destination's response: the raw body slice
 * persisted to feed_item_deliveries.response_data_raw, and a best-effort
 * human-readable message extracted from JSON error bodies for
 * error_message. Destination responses are untrusted data — they are
 * stored and displayed, never interpreted.
 */

export const RESPONSE_DATA_MAX_LENGTH = 10_000;

/**
 * Read at most RESPONSE_DATA_MAX_LENGTH characters of the response body;
 * null for missing/blank bodies. Read errors surface to the caller (the
 * delivery job ignores them — a body read failure is not a delivery
 * failure).
 */
export async function readResponseData(
  response: Response,
): Promise<string | null> {
  const body = response.body;
  if (!body) return null;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < RESPONSE_DATA_MAX_LENGTH) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (text.trim().length === 0) return null;
  return text.slice(0, RESPONSE_DATA_MAX_LENGTH);
}

/**
 * Best-effort message from a JSON error body, checking the common shapes:
 * {"message": "..."}, {"error": "..."}, {"error": {"message": "..."}},
 * {"detail": "..."}. Null for non-JSON or messageless bodies.
 */
export function extractResponseErrorMessage(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  for (const key of ["message", "error", "detail"]) {
    const entry = record[key];
    if (typeof entry === "string" && entry.trim().length > 0) {
      return entry.trim();
    }
    if (key === "error" && typeof entry === "object" && entry !== null) {
      const nested = (entry as Record<string, unknown>).message;
      if (typeof nested === "string" && nested.trim().length > 0) {
        return nested.trim();
      }
    }
  }
  return null;
}
