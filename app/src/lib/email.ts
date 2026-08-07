/**
 * Transactional email transport (Resend); templates live in `src/emails`.
 *
 * Sends never throw: callers fire-and-forget (email delivery must not affect
 * the request that triggered it), so failures are logged and surfaced as a
 * boolean. When RESEND_API_KEY is unset, sends are skipped with a warning.
 */
import type { ReactElement } from "react";
import { Resend } from "resend";

import { serverEnv } from "@/lib/env";

let client: Resend | null = null;

function getResend(): Resend | null {
  if (client) return client;
  const key = serverEnv().RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  /** A React Email element (see `src/emails`); Resend renders it to HTML. */
  react: ReactElement;
}

/** Send one email. Returns true on success, false on any failure (never throws). */
export async function sendEmail({
  to,
  subject,
  react,
}: SendEmailInput): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY is not set — skipping "${subject}" to ${to}`,
    );
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: serverEnv().EMAIL_FROM,
      to,
      subject,
      react,
    });
    if (error) {
      console.error(`[email] Resend rejected "${subject}" to ${to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}
