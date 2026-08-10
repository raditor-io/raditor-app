/**
 * GitHub App setup callback ("Setup URL" with redirect-on-update). After the
 * user installs the app and picks repos, GitHub redirects here (inside the
 * connect popup) with the installation_id and, on installs started from our
 * connect flow, the signed state.
 *
 * Org resolution, in order:
 *   1. valid signed state (CSRF-hardened path from /api/github/connect),
 *   2. the current session's admin org (covers installs started on GitHub
 *      directly and states GitHub dropped),
 *   3. otherwise: login redirect back to this URL, so the flow completes
 *      after sign-in.
 *
 * All redirects are based on PUBLIC_APP_URL (never request.url: the dev
 * server binds 0.0.0.0, which browsers refuse to navigate to).
 */
import { NextResponse, type NextRequest } from "next/server";

import { getInstallationAccount } from "@/github/api";
import { verifyConnectState } from "@/lib/crypto/signed-state";
import { requireEnv, serverEnv } from "@/lib/env";
import { adminClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/services/org";
import { recordEvent } from "@/services/record-event";

function connectedUrl(params: Record<string, string>): URL {
  const url = new URL("/github/connected", serverEnv().PUBLIC_APP_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const installationId = Number(params.get("installation_id"));
  const stateToken = params.get("state");

  if (!Number.isInteger(installationId) || installationId <= 0) {
    return NextResponse.redirect(
      connectedUrl({ status: "error", reason: "missing_installation" }),
    );
  }

  // 1. Signed state from the connect flow.
  let organizationId: string | null = null;
  let actorId: string | null = null;
  let returnTo = "/";
  if (stateToken) {
    const env = requireEnv("VAULT_MASTER_KEY");
    const state = verifyConnectState(stateToken, env.VAULT_MASTER_KEY);
    if (state) {
      organizationId = state.organizationId;
      actorId = state.userId;
      returnTo = state.returnTo;
    } else {
      console.warn(
        "[github-setup] state present but failed verification (expired, foreign key, or tampered); falling back to session",
      );
    }
  }

  // 2. Session fallback: bind to the signed-in admin's org.
  if (!organizationId) {
    const ctx = await getOrgContext();
    if (ctx?.isAdmin) {
      organizationId = ctx.organization.id;
      actorId = ctx.user.id;
    } else if (ctx) {
      return NextResponse.redirect(
        connectedUrl({ status: "error", reason: "admin_required" }),
      );
    }
  }

  // 3. No state, no session: authenticate first, then come back here.
  if (!organizationId) {
    const loginUrl = new URL("/login", serverEnv().PUBLIC_APP_URL);
    loginUrl.searchParams.set(
      "next",
      `/api/github/setup?${params.toString()}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const account = await getInstallationAccount(installationId).catch(() => null);
  const { error } = await adminClient().from("github_installations").upsert(
    {
      organization_id: organizationId,
      github_installation_id: installationId,
      github_account_login: account?.login ?? "unknown",
      github_account_type: account?.accountType ?? "Organization",
      is_active: true,
      suspended_at: null,
    },
    { onConflict: "github_installation_id" },
  );
  if (error) {
    console.error("[github-setup] failed to store installation:", error);
    return NextResponse.redirect(
      connectedUrl({ status: "error", reason: "store_failed" }),
    );
  }

  await recordEvent({
    organizationId,
    eventType: "github_installation_connected",
    subjectType: "github_installation",
    subjectId: String(installationId),
    actorKind: actorId ? "user" : "system",
    actorId: actorId ?? undefined,
    payload: { account_login: account?.login ?? null },
  });

  return NextResponse.redirect(
    connectedUrl({ status: "ok", return: returnTo }),
  );
}
