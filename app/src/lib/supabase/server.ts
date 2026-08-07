/**
 * Server-side Supabase clients.
 *
 * - `serverClient()` — per-request client bound to the user's session cookies;
 *   all user-facing reads/writes go through it so RLS applies.
 * - `adminClient()` — service-role client that BYPASSES RLS. Server-only, for
 *   jobs, webhooks, the invite token lookup, and the audit event log. Never
 *   pass its results to the client without an explicit ownership check.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { serverEnv } from "@/lib/env";

export async function serverClient() {
  const cookieStore = await cookies();
  const env = serverEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: cookie writes are not allowed
            // there. Safe to ignore when middleware refreshes sessions.
          }
        },
      },
    },
  );
}

export function adminClient() {
  const env = serverEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
