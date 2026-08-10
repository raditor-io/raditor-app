/**
 * Vercel-style "Connect GitHub" entry point: an admin clicks Connect, we
 * redirect to the GitHub App install page with a signed state so the setup
 * callback can prove which org (and admin) initiated the flow.
 */
import { NextResponse, type NextRequest } from "next/server";

import { installUrl } from "@/github/app-auth";
import { signConnectState } from "@/lib/crypto/signed-state";
import { requireEnv, serverEnv } from "@/lib/env";
import { getOrgContext } from "@/services/org";

export async function GET(request: NextRequest) {
  const appUrl = serverEnv().PUBLIC_APP_URL;
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }
  if (!ctx.isAdmin) {
    // Popup-friendly: the connected page shows the reason and closes itself.
    const url = new URL("/github/connected", appUrl);
    url.searchParams.set("status", "error");
    url.searchParams.set("reason", "admin_required");
    return NextResponse.redirect(url);
  }

  const requested = request.nextUrl.searchParams.get("return") ?? "/";
  const returnTo =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const env = requireEnv("VAULT_MASTER_KEY");
  const state = signConnectState(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      returnTo,
    },
    env.VAULT_MASTER_KEY,
  );

  return NextResponse.redirect(installUrl(state));
}
