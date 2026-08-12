/**
 * deliver_feed_item: one signed webhook POST for one (subscription,
 * feed_item) pair. The feed_item_deliveries row is the attempt log and
 * idempotency guard (unique per pair; already-delivered pairs exit early).
 * Failures throw so pgmq retries via visibility timeout; the row flips to
 * 'failed' once MAX_ATTEMPTS is exhausted.
 */
import { z } from "zod";

import { renderBodyTemplate } from "@/feeds/body-template";
import {
  buildDeliveryPayload,
  signDeliveryHeaders,
} from "@/feeds/delivery-payload";
import { buildSignalEnvelope } from "@/feeds/signal-envelope";
import { openSecret } from "@/lib/crypto/secret-box";
import { adminClient } from "@/lib/supabase/server";
import { MAX_ATTEMPTS } from "@/jobs/queue";
import { registerJob } from "@/jobs/registry";

export const deliverFeedItemSchema = z.object({
  subscriptionId: z.uuid(),
  feedItemId: z.number().int().positive(),
});

const REQUEST_TIMEOUT_MS = 10_000;
const ERROR_MESSAGE_MAX_LENGTH = 500;

async function handleDeliverFeedItem(payload: {
  subscriptionId: string;
  feedItemId: number;
}) {
  const { subscriptionId, feedItemId } = payload;
  const admin = adminClient();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle();
  // Deleted/deactivated/misconfigured subscriptions: nothing to deliver.
  if (
    !subscription?.is_active ||
    subscription.transport !== "pushed_webhook" ||
    !subscription.webhook_url ||
    !subscription.webhook_secret_ciphertext ||
    !subscription.webhook_secret_iv
  ) {
    return;
  }

  const { data: item } = await admin
    .from("feed_items")
    .select("*, feeds!inner(id, name), signals!inner(*)")
    .eq("id", feedItemId)
    .maybeSingle();
  if (!item) return;

  // Attempt log + idempotency guard.
  const { data: existingDelivery } = await admin
    .from("feed_item_deliveries")
    .select("id, status, attempt_count")
    .eq("subscription_id", subscriptionId)
    .eq("feed_item_id", feedItemId)
    .maybeSingle();
  if (existingDelivery?.status === "delivered") return;

  let deliveryId = existingDelivery?.id;
  if (!deliveryId) {
    const { data: created, error: createError } = await admin
      .from("feed_item_deliveries")
      .upsert(
        {
          organization_id: subscription.organization_id,
          subscription_id: subscriptionId,
          feed_item_id: feedItemId,
        },
        { onConflict: "subscription_id,feed_item_id" },
      )
      .select("id")
      .single();
    if (createError) throw createError;
    deliveryId = created.id;
  }
  const attemptCount = (existingDelivery?.attempt_count ?? 0) + 1;

  const feed = item.feeds as unknown as { id: string; name: string };
  const signal = item.signals as unknown as Parameters<
    typeof buildSignalEnvelope
  >[0];
  const envelope = buildSignalEnvelope(signal);
  const deliveryPayload = buildDeliveryPayload({
    feed: { id: feed.id, name: feed.name },
    item: { id: item.id, added_at: item.added_at },
    signal: envelope,
  });
  const method = subscription.webhook_method;
  // fetch forbids request bodies on GET/HEAD; those deliveries are signed
  // pings (signature over the empty payload).
  const hasBody = method !== "GET" && method !== "HEAD";
  let payloadJson = "";
  if (hasBody && subscription.webhook_body_template) {
    const { data: org } = await admin
      .from("organizations")
      .select("display_name")
      .eq("id", subscription.organization_id)
      .maybeSingle();
    payloadJson = renderBodyTemplate(subscription.webhook_body_template, {
      org: { name: org?.display_name ?? "" },
      feed: { id: feed.id, name: feed.name },
      item: { id: item.id, added_at: item.added_at },
      signal: envelope,
    });
  } else if (hasBody) {
    payloadJson = JSON.stringify(deliveryPayload);
  }

  const secretBase64 = openSecret({
    ciphertext: subscription.webhook_secret_ciphertext,
    iv: subscription.webhook_secret_iv,
  });
  const headers = signDeliveryHeaders({
    deliveryId,
    payloadJson,
    secretBase64,
    timestamp: new Date(),
  });
  // Destinations that require auth (e.g. an API like Resend): unseal the
  // subscription's API key and send it in its configured header.
  if (
    subscription.webhook_auth_header_name &&
    subscription.webhook_auth_secret_ciphertext &&
    subscription.webhook_auth_secret_iv
  ) {
    headers[subscription.webhook_auth_header_name] = openSecret({
      ciphertext: subscription.webhook_auth_secret_ciphertext,
      iv: subscription.webhook_auth_secret_iv,
    });
  }

  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
  let errorMessage: string | null = null;
  try {
    const response = await fetch(subscription.webhook_url, {
      method,
      headers,
      ...(hasBody ? { body: payloadJson } : {}),
      redirect: "error",
      signal: abort.signal,
    });
    if (!response.ok) {
      errorMessage = `HTTP ${response.status}`;
    }
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timeout);
  }

  if (errorMessage === null) {
    await admin
      .from("feed_item_deliveries")
      .update({
        status: "delivered",
        attempt_count: attemptCount,
        last_attempted_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", deliveryId);
    return;
  }

  await admin
    .from("feed_item_deliveries")
    .update({
      status: attemptCount >= MAX_ATTEMPTS ? "failed" : "pending",
      attempt_count: attemptCount,
      last_attempted_at: new Date().toISOString(),
      error_message: errorMessage.slice(0, ERROR_MESSAGE_MAX_LENGTH),
    })
    .eq("id", deliveryId);

  throw new Error(
    `delivery ${deliveryId} to ${subscription.webhook_url} failed: ${errorMessage}`,
  );
}

export function registerDeliverFeedItem(): void {
  registerJob("deliver_feed_item", {
    schema: deliverFeedItemSchema,
    handler: handleDeliverFeedItem,
  });
}
