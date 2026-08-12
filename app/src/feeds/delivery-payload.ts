/**
 * Webhook delivery wire format + Standard Webhooks signing. The payload is
 * the canonical signal envelope wrapped with feed/item context; headers are
 * webhook-id / webhook-timestamp / webhook-signature (v1 HMAC) so any
 * Standard Webhooks consumer library verifies deliveries out of the box.
 */
import { randomBytes } from "node:crypto";

import { Webhook } from "standardwebhooks";

import type { SignalEnvelope } from "@/feeds/signal-envelope";

export interface DeliveryPayload {
  type: "feed_item_added";
  feed: { id: string; name: string };
  item: { id: number; added_at: string };
  signal: SignalEnvelope;
}

export function buildDeliveryPayload(input: {
  feed: { id: string; name: string };
  item: { id: number; added_at: string };
  signal: SignalEnvelope;
}): DeliveryPayload {
  return {
    type: "feed_item_added",
    feed: input.feed,
    item: input.item,
    signal: input.signal,
  };
}

const WEBHOOK_SECRET_BYTES = 24;
const WEBHOOK_SECRET_DISPLAY_PREFIX = "whsec_";

/** Base64 secret material; display/store form is `whsec_<base64>`. */
export function generateWebhookSecret(): string {
  return randomBytes(WEBHOOK_SECRET_BYTES).toString("base64");
}

export function displayWebhookSecret(secretBase64: string): string {
  return `${WEBHOOK_SECRET_DISPLAY_PREFIX}${secretBase64}`;
}

export type SignedDeliveryHeaders = Record<string, string>;

export function signDeliveryHeaders(input: {
  deliveryId: string;
  payloadJson: string;
  secretBase64: string;
  timestamp: Date;
}): SignedDeliveryHeaders {
  const webhook = new Webhook(input.secretBase64);
  const signature = webhook.sign(
    input.deliveryId,
    input.timestamp,
    input.payloadJson,
  );
  return {
    "content-type": "application/json",
    "webhook-id": input.deliveryId,
    "webhook-timestamp": String(Math.floor(input.timestamp.getTime() / 1000)),
    "webhook-signature": signature,
  };
}
