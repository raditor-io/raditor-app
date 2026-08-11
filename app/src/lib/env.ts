/**
 * Typed access to environment variables. Parsed lazily (not at module load)
 * so `next build` succeeds without a full env; missing values fail loudly at
 * first use instead.
 *
 * Client-safe values use the NEXT_PUBLIC_ prefix and are read directly where
 * needed; everything in `serverEnv()` is server-only and must never be
 * imported into client components.
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Supabase's new key model: sb_publishable_... (client-safe, replaces the
  // legacy anon JWT) and sb_secret_... (server-only, replaces service_role).
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PUBLIC_APP_URL: z.url().default("http://localhost:4000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Raditor <team@mail.raditor.io>"),
  // Supabase Auth "Send Email" hook secret (v1,whsec_...). Required for the
  // /api/auth/send-email endpoint that delivers OTP codes via Resend.
  SEND_EMAIL_HOOK_SECRET: z.string().optional(),
  // GitHub App credentials (see docs/github-app-setup.md). Optional so the
  // app boots without them; the GitHub routes fail loudly when missing.
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  // App-wide server secret: signs the GitHub connect state now, encrypts the
  // BYOK vault in Phase 9. 32 bytes base64.
  VAULT_MASTER_KEY: z.string().optional(),
  // Bearer guard for /api/jobs/* and /api/cron/* (Phase 3).
  CRON_SECRET: z.string().optional(),
  // Venice.ai platform key (BYOK org keys take precedence from Phase 9).
  VENICE_API_KEY: z.string().optional(),
});

/** Like serverEnv() but throws unless the named keys are present. */
export function requireEnv<K extends keyof ServerEnv>(
  ...keys: K[]
): { [P in K]: NonNullable<ServerEnv[P]> } {
  const env = serverEnv();
  for (const key of keys) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  return env as { [P in K]: NonNullable<ServerEnv[P]> };
}

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/** Parse (once) and return the server environment. Throws on missing values. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid server environment, check: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test seam: parse an arbitrary env-shaped object with the same schema. */
export function parseServerEnv(env: Record<string, string | undefined>) {
  return serverEnvSchema.safeParse(env);
}
