/**
 * Auth email delivery via the Supabase "Send Email" auth hook.
 *
 * Supabase calls POST /api/auth/send-email (Standard Webhooks signature)
 * instead of sending its own SMTP mail; we deliver a 6-digit OTP code through
 * Resend. The UI confirms with supabase.auth.verifyOtp(), so emails carry the
 * code only, never a confirmation link.
 */
import { z } from "zod";

export const sendEmailHookSchema = z.object({
  user: z.object({
    email: z.string(),
    new_email: z.string().nullish(),
  }),
  email_data: z.object({
    token: z.string(),
    token_new: z.string().nullish(),
    email_action_type: z.string(),
  }),
});

export type SendEmailHookPayload = z.infer<typeof sendEmailHookSchema>;

export interface AuthEmailContent {
  to: string;
  subject: string;
  headline: string;
  description: string;
  code: string;
}

const CONTENT_BY_ACTION: Record<
  string,
  { subject: string; headline: string; description: string }
> = {
  signup: {
    subject: "Your Raditor confirmation code",
    headline: "Confirm your email",
    description:
      "Enter this code in Raditor to confirm your email address and finish creating your account.",
  },
  magiclink: {
    subject: "Your Raditor sign-in code",
    headline: "Sign in to Raditor",
    description: "Enter this code in Raditor to sign in.",
  },
  recovery: {
    subject: "Your Raditor password reset code",
    headline: "Reset your password",
    description:
      "Enter this code in Raditor to continue resetting your password.",
  },
  email_change: {
    subject: "Confirm your email change for Raditor",
    headline: "Confirm your email change",
    description:
      "Enter this code in Raditor to confirm changing your email address.",
  },
  invite: {
    subject: "Your Raditor invitation code",
    headline: "You have been invited",
    description: "Enter this code in Raditor to accept your invitation.",
  },
  reauthentication: {
    subject: "Your Raditor verification code",
    headline: "Verify it is you",
    description: "Enter this code in Raditor to confirm this action.",
  },
};

const FALLBACK = {
  subject: "Your Raditor verification code",
  headline: "Your verification code",
  description: "Enter this code in Raditor to continue.",
};

/**
 * Map one hook payload to the emails to send. Secure email change produces
 * two mails (current address gets `token`, new address gets `token_new`);
 * everything else produces exactly one.
 */
export function buildAuthEmails(
  payload: SendEmailHookPayload,
): AuthEmailContent[] {
  const { user, email_data: emailData } = payload;
  const content =
    CONTENT_BY_ACTION[emailData.email_action_type] ?? FALLBACK;

  const emails: AuthEmailContent[] = [
    { to: user.email, code: emailData.token, ...content },
  ];

  if (
    emailData.email_action_type === "email_change" &&
    user.new_email &&
    emailData.token_new
  ) {
    emails.push({ to: user.new_email, code: emailData.token_new, ...content });
  }

  return emails;
}

/**
 * Normalize the dashboard-provided hook secret to the base64 payload the
 * standardwebhooks library expects (it is shown as `v1,whsec_<base64>`).
 */
export function normalizeHookSecret(secret: string): string {
  return secret.replace(/^v1,/, "").replace(/^whsec_/, "");
}
