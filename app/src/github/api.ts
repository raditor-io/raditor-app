/**
 * Thin GitHub REST helpers on top of installation-scoped Octokit clients:
 * repo discovery for target pickers and diff enrichment for scans.
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

export interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  /** Unified diff hunk; undefined for binary or oversized files. */
  patch?: string;
}

/** Changed files (with patches) of one commit. */
export async function getCommitDiffFiles(
  githubInstallationId: number,
  repoFullName: string,
  sha: string,
): Promise<DiffFile[]> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) return [];
  const octokit = await installationClient(githubInstallationId);
  const { data } = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });
  return (data.files ?? []).map((file) => ({
    filename: file.filename,
    status: file.status ?? "modified",
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
    patch: file.patch,
  }));
}

/** Changed files (with patches) of one pull request (first 100 files). */
export async function getPullRequestDiffFiles(
  githubInstallationId: number,
  repoFullName: string,
  pullNumber: number,
): Promise<DiffFile[]> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) return [];
  const octokit = await installationClient(githubInstallationId);
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return data.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,
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
