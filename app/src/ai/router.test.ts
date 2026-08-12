import { afterEach, describe, expect, it } from "vitest";

import { FakeAiProvider } from "@/ai/providers/fake";

import { aiChat, parseJsonResponse, setProviderForTesting } from "./router";

describe("parseJsonResponse", () => {
  it("parses a plain JSON object", () => {
    expect(parseJsonResponse<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses fenced JSON", () => {
    expect(
      parseJsonResponse<{ ok: boolean }>('```json\n{"ok": true}\n```'),
    ).toEqual({ ok: true });
  });

  it("extracts the object from surrounding prose", () => {
    expect(
      parseJsonResponse<{ score: number }>(
        'Here is my assessment: {"score": 72} as requested.',
      ),
    ).toEqual({ score: 72 });
  });

  it("throws when no JSON object exists", () => {
    expect(() => parseJsonResponse("no json here")).toThrow(/no parseable/);
  });
});

describe("aiChat", () => {
  afterEach(() => setProviderForTesting(null));

  it("propagates isWebSearchEnabled and isJsonResponse to the provider", async () => {
    const fake = new FakeAiProvider([{ match: "*", content: "{}" }]);
    setProviderForTesting(fake);

    await aiChat({
      organizationId: "00000000-0000-0000-0000-000000000000",
      functionality: "scan_briefing",
      isWebSearchEnabled: true,
      isJsonResponse: true,
      messages: [{ role: "user", content: "hunt" }],
    });

    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0].isWebSearchEnabled).toBe(true);
    expect(fake.calls[0].isJsonResponse).toBe(true);
  });
});
