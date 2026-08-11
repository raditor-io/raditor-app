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

// --- Publish helpers (branch + commit + PR) -----------------------------------

/** File content + blob sha on a ref, or null when it does not exist. */
export async function getFileContent(
  githubInstallationId: number,
  repoFullName: string,
  filePath: string,
  ref: string,
): Promise<{ content: string; sha: string } | null> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) return null;
  const octokit = await installationClient(githubInstallationId);
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref,
    });
    if (Array.isArray(data) || data.type !== "file") return null;
    return {
      content: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    };
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

/** Blob sha of a file on a branch, or null when it does not exist. */
export async function getFileBlobSha(
  githubInstallationId: number,
  repoFullName: string,
  filePath: string,
  ref: string,
): Promise<string | null> {
  const file = await getFileContent(
    githubInstallationId,
    repoFullName,
    filePath,
    ref,
  );
  return file?.sha ?? null;
}

/** Create the branch from the base branch head (no-op when it exists). */
export async function ensureBranch(
  githubInstallationId: number,
  repoFullName: string,
  branchName: string,
  baseBranch: string,
): Promise<void> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo: ${repoFullName}`);
  const octokit = await installationClient(githubInstallationId);

  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branchName}` });
    return;
  } catch (err) {
    if ((err as { status?: number }).status !== 404) throw err;
  }

  const { data: baseRef } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseRef.object.sha,
  });
}

/** Commit one file to a branch (create or update). Returns the new blob sha. */
export async function commitFileToBranch(
  githubInstallationId: number,
  repoFullName: string,
  branchName: string,
  filePath: string,
  content: string,
  commitMessage: string,
): Promise<string | null> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo: ${repoFullName}`);
  const octokit = await installationClient(githubInstallationId);

  const existingSha = await getFileBlobSha(
    githubInstallationId,
    repoFullName,
    filePath,
    branchName,
  );

  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    branch: branchName,
    message: commitMessage,
    content: Buffer.from(content, "utf8").toString("base64"),
    ...(existingSha ? { sha: existingSha } : {}),
  });
  return data.content?.sha ?? null;
}

/** Open a pull request; returns number and head sha. */
export async function createPullRequest(
  githubInstallationId: number,
  repoFullName: string,
  input: { title: string; body: string; head: string; base: string },
): Promise<{ prNumber: number; headSha: string; htmlUrl: string }> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo: ${repoFullName}`);
  const octokit = await installationClient(githubInstallationId);
  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: input.title,
    body: input.body,
    head: input.head,
    base: input.base,
  });
  return {
    prNumber: data.number,
    headSha: data.head.sha,
    htmlUrl: data.html_url,
  };
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
