/**
 * Machine auth for the pull API: resolves a Bearer rad_… token to its
 * pulled_feed subscription (sessionless parallel to getOrgContext). Token
 * lookup is by SHA-256 digest; a 256-bit random token needs no timing-safe
 * compare (same posture as invite tokens).
 */
import type { Database } from "@/lib/database.types";
import { hashApiToken, isApiToken } from "@/lib/crypto/api-token";
import { adminClient } from "@/lib/supabase/server";

export type SubscriptionRow =
  Database["public"]["Tables"]["subscriptions"]["Row"];

export class PullApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface PullContext {
  subscription: SubscriptionRow;
}

export async function requirePullContext(
  request: Request,
  feedId: string,
): Promise<PullContext> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!isApiToken(token)) {
    throw new PullApiError(401, "Missing or malformed Bearer token.");
  }

  const { data: subscription, error } = await adminClient()
    .from("subscriptions")
    .select("*")
    .eq("api_token_hash", hashApiToken(token))
    .eq("transport", "pulled_feed")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!subscription) {
    throw new PullApiError(401, "Unknown or revoked token.");
  }
  // A valid token for a different feed gets 404, not 403 (no existence leak).
  if (subscription.feed_id !== feedId) {
    throw new PullApiError(404, "Feed not found.");
  }

  return { subscription };
}
