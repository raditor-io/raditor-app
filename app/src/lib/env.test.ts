import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
};

describe("parseServerEnv", () => {
  it("accepts a minimal valid environment and applies defaults", () => {
    const result = parseServerEnv(VALID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PUBLIC_APP_URL).toBe("http://localhost:4000");
      expect(result.data.EMAIL_FROM).toContain("Raditor");
    }
  });

  it("rejects a missing Supabase URL", () => {
    const { NEXT_PUBLIC_SUPABASE_URL: _omitted, ...rest } = VALID;
    const result = parseServerEnv(rest);
    expect(result.success).toBe(false);
  });

  it("rejects a malformed Supabase URL", () => {
    const result = parseServerEnv({
      ...VALID,
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
