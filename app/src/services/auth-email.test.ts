import { describe, expect, it } from "vitest";

import {
  buildAuthEmails,
  normalizeHookSecret,
  sendEmailHookSchema,
} from "./auth-email";

describe("sendEmailHookSchema", () => {
  it("parses a minimal Supabase hook payload", () => {
    const result = sendEmailHookSchema.safeParse({
      user: { email: "user@example.com" },
      email_data: {
        token: "123456",
        email_action_type: "signup",
        token_hash: "ignored",
        redirect_to: "ignored",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("buildAuthEmails", () => {
  it("builds one signup email with the OTP code", () => {
    const emails = buildAuthEmails({
      user: { email: "user@example.com" },
      email_data: { token: "123456", email_action_type: "signup" },
    });
    expect(emails).toHaveLength(1);
    expect(emails[0]!.to).toBe("user@example.com");
    expect(emails[0]!.code).toBe("123456");
    expect(emails[0]!.subject).toContain("confirmation code");
  });

  it("falls back to a generic subject for unknown action types", () => {
    const emails = buildAuthEmails({
      user: { email: "user@example.com" },
      email_data: { token: "123456", email_action_type: "something_new" },
    });
    expect(emails[0]!.subject).toBe("Your Raditor verification code");
  });

  it("sends two emails for a secure email change", () => {
    const emails = buildAuthEmails({
      user: { email: "old@example.com", new_email: "new@example.com" },
      email_data: {
        token: "111111",
        token_new: "222222",
        email_action_type: "email_change",
      },
    });
    expect(emails).toHaveLength(2);
    expect(emails[0]).toMatchObject({ to: "old@example.com", code: "111111" });
    expect(emails[1]).toMatchObject({ to: "new@example.com", code: "222222" });
  });
});

describe("normalizeHookSecret", () => {
  it("strips the v1,whsec_ prefix", () => {
    expect(normalizeHookSecret("v1,whsec_abc123==")).toBe("abc123==");
  });

  it("strips a bare whsec_ prefix", () => {
    expect(normalizeHookSecret("whsec_abc123==")).toBe("abc123==");
  });

  it("passes through an unprefixed secret", () => {
    expect(normalizeHookSecret("abc123==")).toBe("abc123==");
  });
});
