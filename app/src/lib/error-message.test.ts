import { describe, expect, it } from "vitest";

import { errorMessage } from "./error-message";

describe("errorMessage", () => {
  it("uses Error messages", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("uses message properties of plain objects (PostgrestError shape)", () => {
    expect(
      errorMessage(
        { message: "duplicate key value", code: "23505" },
        "fallback",
      ),
    ).toBe("duplicate key value");
  });

  it("falls back for empty messages and non-objects", () => {
    expect(errorMessage(new Error(""), "fallback")).toBe("fallback");
    expect(errorMessage({ message: "" }, "fallback")).toBe("fallback");
    expect(errorMessage("string error", "fallback")).toBe("fallback");
    expect(errorMessage(null, "fallback")).toBe("fallback");
    expect(errorMessage(undefined, "fallback")).toBe("fallback");
  });
});
