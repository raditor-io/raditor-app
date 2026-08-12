import { describe, expect, it } from "vitest";

import { validateWebhookUrl } from "./webhook-url";

describe("validateWebhookUrl", () => {
  it("accepts public https URLs", () => {
    expect(validateWebhookUrl("https://api.example.com/hooks/raditor").isValid).toBe(
      true,
    );
    expect(validateWebhookUrl("https://8.8.8.8/hook").isValid).toBe(true);
  });

  it("rejects non-https schemes", () => {
    expect(validateWebhookUrl("http://example.com/hook").isValid).toBe(false);
    expect(validateWebhookUrl("ftp://example.com/hook").isValid).toBe(false);
  });

  it("rejects local and internal hostnames", () => {
    expect(validateWebhookUrl("https://localhost/hook").isValid).toBe(false);
    expect(validateWebhookUrl("https://db.internal/hook").isValid).toBe(false);
    expect(validateWebhookUrl("https://printer.local/hook").isValid).toBe(false);
    expect(validateWebhookUrl("https://intranet-host/hook").isValid).toBe(false);
  });

  it("rejects private and reserved IPv4 ranges", () => {
    for (const host of [
      "10.0.0.1",
      "127.0.0.1",
      "169.254.1.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "0.0.0.0",
    ]) {
      expect(validateWebhookUrl(`https://${host}/hook`).isValid).toBe(false);
    }
  });

  it("rejects IPv6 literals", () => {
    expect(validateWebhookUrl("https://[::1]/hook").isValid).toBe(false);
  });

  it("rejects garbage", () => {
    expect(validateWebhookUrl("not a url").isValid).toBe(false);
  });
});
