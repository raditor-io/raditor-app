/**
 * Thin GitHub REST helpers on top of installation-scoped Octokit clients.
 * Grows tree/blob/PR operations in Phases 4-5.
 */
import { githubApp, installationClient } from "@/github/app-auth";

export interface GithubRepo {
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
}

/** All repositories the installation grants access to (paginated). */
export async function listInstallationRepos(
  githubInstallationId: number,
): Promise<GithubRepo[]> {
  const octokit = await installationClient(githubInstallationId);
  const repos = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
  );
  return repos.map((repo) => ({
    fullName: repo.full_name,
    defaultBranch: repo.default_branch,
    isPrivate: repo.private,
  }));
}

/** Installation metadata straight from GitHub (account login/type). */
export async function getInstallationAccount(
  githubInstallationId: number,
): Promise<{ login: string; accountType: string } | null> {
  const { data } = await githubApp().octokit.rest.apps.getInstallation({
    installation_id: githubInstallationId,
  });
  const account = data.account;
  if (!account) return null;
  const login = "login" in account ? account.login : account.slug;
  const accountType =
    "type" in account ? (account.type ?? "User") : "Organization";
  return { login, accountType };
}
