import { describe, expect, it } from "vitest";
import { Webhook } from "standardwebhooks";

import {
  buildDeliveryPayload,
  displayWebhookSecret,
  generateWebhookSecret,
  signDeliveryHeaders,
} from "./delivery-payload";

const SIGNAL = {
  id: "sig-1",
  radar_id: "radar-1",
  kind: "price_changed",
  title: "Competitor dropped prices",
  summary_md: "Prices dropped by 20%.",
  body_md: "",
  evidence: [{ url: "https://example.com/pricing" }],
  occurred_at: "2026-08-12T08:00:00.000Z",
};

describe("buildDeliveryPayload", () => {
  it("wraps the signal envelope with feed and item context", () => {
    const payload = buildDeliveryPayload({
      feed: { id: "feed-1", name: "Pricing" },
      item: { id: 42, added_at: "2026-08-12T08:05:00.000Z" },
      signal: SIGNAL,
    });
    expect(payload.type).toBe("feed_item_added");
    expect(payload.feed.name).toBe("Pricing");
    expect(payload.item.id).toBe(42);
    expect(payload.signal.kind).toBe("price_changed");
  });
});

describe("webhook secrets", () => {
  it("generates base64 material displayed with the whsec_ prefix", () => {
    const secret = generateWebhookSecret();
    expect(Buffer.from(secret, "base64")).toHaveLength(24);
    expect(displayWebhookSecret(secret)).toBe(`whsec_${secret}`);
  });
});

describe("signDeliveryHeaders", () => {
  it("produces headers a Standard Webhooks consumer can verify", () => {
    const secret = generateWebhookSecret();
    const payloadJson = JSON.stringify(
      buildDeliveryPayload({
        feed: { id: "feed-1", name: "Pricing" },
        item: { id: 42, added_at: "2026-08-12T08:05:00.000Z" },
        signal: SIGNAL,
      }),
    );
    const headers = signDeliveryHeaders({
      deliveryId: "delivery-1",
      payloadJson,
      secretBase64: secret,
      timestamp: new Date(),
    });

    expect(headers["webhook-id"]).toBe("delivery-1");
    expect(headers["webhook-signature"]).toMatch(/^v1,/);

    // Consumer-side verification with the same library.
    const consumer = new Webhook(secret);
    expect(() => consumer.verify(payloadJson, headers)).not.toThrow();
  });

  it("signature changes with the payload", () => {
    const secret = generateWebhookSecret();
    const now = new Date();
    const a = signDeliveryHeaders({
      deliveryId: "d",
      payloadJson: '{"a":1}',
      secretBase64: secret,
      timestamp: now,
    });
    const b = signDeliveryHeaders({
      deliveryId: "d",
      payloadJson: '{"a":2}',
      secretBase64: secret,
      timestamp: now,
    });
    expect(a["webhook-signature"]).not.toBe(b["webhook-signature"]);
  });
});
