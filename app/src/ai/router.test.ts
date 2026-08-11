import { describe, expect, it } from "vitest";

import { parseJsonResponse } from "./router";

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
