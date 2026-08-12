/**
 * Subscription service: who consumes a feed and how. Secrets are shown
 * exactly once at creation — only the AES-sealed webhook secret / SHA-256
 * token digest are stored, and list reads select non-secret columns only.
 * Admins manage all subscriptions; members self-manage their in_app rows
 * (RLS enforces both).
 */
import {
  apiTokenPrefix,
  generateApiToken,
  hashApiToken,
} from "@/lib/crypto/api-token";
import { sealSecret } from "@/lib/crypto/secret-box";
import {
  displayWebhookSecret,
  generateWebhookSecret,
} from "@/feeds/delivery-payload";
import { validateWebhookUrl } from "@/feeds/webhook-url";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireAdminContext, requireOrgContext } from "@/services/org";

export interface SubscriptionListRow {
  id: string;
  name: string;
  subscriberKind: string;
  transport: string;
  webhookUrl: string | null;
  webhookMethod: string;
  apiTokenPrefix: string | null;
  lastAckedFeedItemId: number;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
}

const LIST_COLUMNS =
  "id, name, subscriber_kind, transport, webhook_url, webhook_method, api_token_prefix, last_acked_feed_item_id, user_id, is_active, created_at";

export async function listSubscriptions(
  feedId: string,
): Promise<SubscriptionListRow[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(LIST_COLUMNS)
    .eq("feed_id", feedId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    subscriberKind: row.subscriber_kind,
    transport: row.transport,
    webhookUrl: row.webhook_url,
    webhookMethod: row.webhook_method,
    apiTokenPrefix: row.api_token_prefix,
    lastAckedFeedItemId: Number(row.last_acked_feed_item_id),
    userId: row.user_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

const AUTH_HEADER_NAME_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export const WEBHOOK_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
] as const;
export type WebhookMethod = (typeof WEBHOOK_METHODS)[number];

export async function createWebhookSubscription(input: {
  feedId: string;
  name: string;
  webhookUrl: string;
  method?: WebhookMethod;
  /** Optional extra request header for destinations that need an API key. */
  apiKey?: { headerName: string; value: string };
  /** Optional body template ({{path}} placeholders); null = standard envelope. */
  bodyTemplate?: string;
}): Promise<{ subscriptionId: string; secretShownOnce: string }> {
  const ctx = await requireAdminContext();

  const validation = validateWebhookUrl(input.webhookUrl);
  if (!validation.isValid) {
    throw new Error(validation.reason ?? "Invalid webhook URL.");
  }
  if (input.apiKey && !AUTH_HEADER_NAME_PATTERN.test(input.apiKey.headerName)) {
    throw new Error("Header name must be letters, digits, or hyphens.");
  }

  const secret = generateWebhookSecret();
  const sealed = sealSecret(secret);
  const sealedApiKey = input.apiKey ? sealSecret(input.apiKey.value) : null;

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: ctx.organization.id,
      feed_id: input.feedId,
      name: input.name,
      subscriber_kind: "web_service",
      transport: "pushed_webhook",
      webhook_url: input.webhookUrl.trim(),
      webhook_method: input.method ?? "POST",
      webhook_body_template: input.bodyTemplate ?? null,
      webhook_secret_ciphertext: sealed.ciphertext,
      webhook_secret_iv: sealed.iv,
      webhook_auth_header_name: input.apiKey?.headerName ?? null,
      webhook_auth_secret_ciphertext: sealedApiKey?.ciphertext ?? null,
      webhook_auth_secret_iv: sealedApiKey?.iv ?? null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "subscription_created",
    subjectType: "subscription",
    subjectId: data.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { feed_id: input.feedId, transport: "pushed_webhook" },
  });

  return {
    subscriptionId: data.id,
    secretShownOnce: displayWebhookSecret(secret),
  };
}

export async function createPullSubscription(input: {
  feedId: string;
  name: string;
  subscriberKind: "agent" | "web_service";
}): Promise<{ subscriptionId: string; tokenShownOnce: string }> {
  const ctx = await requireAdminContext();

  const token = generateApiToken();

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: ctx.organization.id,
      feed_id: input.feedId,
      name: input.name,
      subscriber_kind: input.subscriberKind,
      transport: "pulled_feed",
      api_token_hash: hashApiToken(token),
      api_token_prefix: apiTokenPrefix(token),
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "subscription_created",
    subjectType: "subscription",
    subjectId: data.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { feed_id: input.feedId, transport: "pulled_feed" },
  });

  return { subscriptionId: data.id, tokenShownOnce: token };
}

/** Member self-service: pin this feed as an in-app subscription. */
export async function createInAppSubscription(feedId: string): Promise<void> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { error } = await supabase.from("subscriptions").insert({
    organization_id: ctx.organization.id,
    feed_id: feedId,
    name: ctx.user.email ?? "In-app",
    subscriber_kind: "user",
    transport: "in_app",
    user_id: ctx.user.id,
    created_by: ctx.user.id,
  });
  // Unique (feed_id, user_id) makes double-subscribing a no-op error; ignore.
  if (error && !error.message.includes("duplicate")) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "subscription_created",
    subjectType: "feed",
    subjectId: feedId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { transport: "in_app" },
  });
}

export async function removeInAppSubscription(feedId: string): Promise<void> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("feed_id", feedId)
    .eq("transport", "in_app")
    .eq("user_id", ctx.user.id);
  if (error) throw error;
}

export async function setSubscriptionActive(
  subscriptionId: string,
  isActive: boolean,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ is_active: isActive })
    .eq("id", subscriptionId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;
}

export async function deleteSubscription(
  subscriptionId: string,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", subscriptionId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "subscription_deleted",
    subjectType: "subscription",
    subjectId: subscriptionId,
    actorKind: "user",
    actorId: ctx.user.id,
  });
}

export interface DeliveryListRow {
  id: string;
  feedItemId: number;
  status: string;
  attemptCount: number;
  lastAttemptedAt: string | null;
  errorMessage: string | null;
}

export async function listDeliveries(
  subscriptionId: string,
  limit = 5,
): Promise<DeliveryListRow[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("feed_item_deliveries")
    .select("id, feed_item_id, status, attempt_count, last_attempted_at, error_message")
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    feedItemId: Number(row.feed_item_id),
    status: row.status,
    attemptCount: row.attempt_count,
    lastAttemptedAt: row.last_attempted_at,
    errorMessage: row.error_message,
  }));
}
