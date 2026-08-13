import { describe, expect, it } from "vitest";

import {
  RESPONSE_DATA_MAX_LENGTH,
  extractResponseErrorMessage,
  readResponseData,
} from "./response-capture";

describe("readResponseData", () => {
  it("returns the body text", async () => {
    const data = await readResponseData(new Response('{"ok":true}'));
    expect(data).toBe('{"ok":true}');
  });

  it("returns null for a missing body", async () => {
    const data = await readResponseData(new Response(null, { status: 204 }));
    expect(data).toBeNull();
  });

  it("returns null for a blank body", async () => {
    const data = await readResponseData(new Response("  \n"));
    expect(data).toBeNull();
  });

  it("truncates oversized bodies to the bound", async () => {
    const data = await readResponseData(
      new Response("x".repeat(RESPONSE_DATA_MAX_LENGTH * 3)),
    );
    expect(data).toHaveLength(RESPONSE_DATA_MAX_LENGTH);
  });
});

describe("extractResponseErrorMessage", () => {
  it("reads a top-level message (Resend shape)", () => {
    const raw =
      '{"statusCode":403,"message":"The mails.example.com domain is not verified","name":"validation_error"}';
    expect(extractResponseErrorMessage(raw)).toBe(
      "The mails.example.com domain is not verified",
    );
  });

  it("reads an error string", () => {
    expect(extractResponseErrorMessage('{"error":"invalid signature"}')).toBe(
      "invalid signature",
    );
  });

  it("reads a nested error.message", () => {
    expect(
      extractResponseErrorMessage('{"error":{"message":"quota exceeded"}}'),
    ).toBe("quota exceeded");
  });

  it("reads a detail string", () => {
    expect(extractResponseErrorMessage('{"detail":"Not found."}')).toBe(
      "Not found.",
    );
  });

  it("prefers message over error", () => {
    expect(
      extractResponseErrorMessage('{"message":"first","error":"second"}'),
    ).toBe("first");
  });

  it("returns null for non-JSON bodies", () => {
    expect(extractResponseErrorMessage("<html>Forbidden</html>")).toBeNull();
  });

  it("returns null for JSON without a message", () => {
    expect(extractResponseErrorMessage('{"status":"error"}')).toBeNull();
    expect(extractResponseErrorMessage('"just a string"')).toBeNull();
    expect(extractResponseErrorMessage('{"message":"  "}')).toBeNull();
  });
});
