/**
 * GitHub App authentication: App JWT → per-installation Octokit clients.
 * Tokens are minted per use (no cache layer yet — boring and correct;
 * installation tokens live 1 hour and calls are low-volume at MVP).
 */
import { App } from "octokit";

import { requireEnv } from "@/lib/env";

let app: App | null = null;

export function githubApp(): App {
  if (app) return app;
  const env = requireEnv("GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY");
  app = new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
  });
  return app;
}

/** Octokit authenticated as one installation (repo-scoped API access). */
export async function installationClient(githubInstallationId: number) {
  return githubApp().getInstallationOctokit(githubInstallationId);
}

/**
 * Install URL of the app: the select_target account picker ("Where do you
 * want to install?"), exactly like Vercel's connect popup. Unlike
 * installations/new, it also behaves sanely when the app is already
 * installed somewhere (Configure instead of a dead-end settings page).
 */
export function installUrl(state: string): string {
  const env = requireEnv("GITHUB_APP_SLUG");
  return `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/select_target?state=${encodeURIComponent(state)}`;
}
