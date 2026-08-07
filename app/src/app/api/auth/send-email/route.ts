/**
 * Supabase Auth "Send Email" hook: Supabase calls this endpoint instead of
 * sending its own SMTP mail. We verify the Standard Webhooks signature and
 * deliver the 6-digit OTP through Resend (src/emails/auth-code.tsx).
 *
 * Configure in Supabase: Auth → Hooks → Send Email → HTTPS →
 *   https://<app-domain>/api/auth/send-email
 * and put the generated secret in SEND_EMAIL_HOOK_SECRET. In local dev the
 * hook needs a tunnel to reach localhost.
 */
import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";

import { AuthCodeEmail } from "@/emails/auth-code";
import { sendEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import {
  buildAuthEmails,
  normalizeHookSecret,
  sendEmailHookSchema,
} from "@/services/auth-email";

export async function POST(request: NextRequest) {
  const secret = serverEnv().SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    console.error("[auth-email] SEND_EMAIL_HOOK_SECRET is not configured");
    return NextResponse.json({ error: "hook not configured" }, { status: 500 });
  }

  const payloadText = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  let verified: unknown;
  try {
    const webhook = new Webhook(normalizeHookSecret(secret));
    verified = webhook.verify(payloadText, headers);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const parsed = sendEmailHookSchema.safeParse(verified);
  if (!parsed.success) {
    console.error("[auth-email] unexpected hook payload shape:", parsed.error);
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const emails = buildAuthEmails(parsed.data);

  // Without a Resend key, auth emails cannot be delivered. In dev we log the
  // code so signup flows stay testable; in production this is a hard error.
  if (!serverEnv().RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error("[auth-email] RESEND_API_KEY missing in production");
      return NextResponse.json(
        { error: "email delivery not configured" },
        { status: 500 },
      );
    }
    for (const email of emails) {
      console.warn(
        `[auth-email] DEV: no RESEND_API_KEY, OTP for ${email.to} (${parsed.data.email_data.email_action_type}): ${email.code}`,
      );
    }
    return NextResponse.json({ success: true });
  }

  for (const email of emails) {
    const isSent = await sendEmail({
      to: email.to,
      subject: email.subject,
      react: AuthCodeEmail({
        headline: email.headline,
        description: email.description,
        code: email.code,
      }),
    });
    if (!isSent) {
      return NextResponse.json(
        { error: "email delivery failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
