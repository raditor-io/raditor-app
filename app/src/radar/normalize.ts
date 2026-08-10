/**
 * Pure GitHub webhook payload → source_event row mapping. No AI, no network:
 * runs synchronously in the webhook receiver. Watch flags on the source's
 * watch_config decide which events materialize; everything else returns null.
 *
 * The payload column keeps only what the radar needs (titles, URLs, refs) —
 * source text is attacker-writable and is treated as data downstream
 * (wrapped via ai/untrusted before ever reaching a prompt).
 */

export interface WatchConfig {
  is_watching_releases?: boolean;
  is_watching_default_branch_merges?: boolean;
  is_watching_labeled_issues?: boolean;
  issue_labels?: string[];
  path_filters?: string[];
}

export type SourceEventKind =
  | "release_published"
  | "pull_request_merged"
  | "push_default_branch"
  | "issue_labeled";

export interface NormalizedSourceEvent {
  eventKind: SourceEventKind;
  /** Stable id within the source; (source_id, external_ref) dedupes redelivery. */
  externalRef: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

// Webhook payloads are foreign JSON; fields are accessed defensively and
// narrowed at the point of use.
type GithubPayload = Record<string, any>;

export function normalizeGithubEvent(
  eventName: string,
  payload: GithubPayload,
  watchConfig: WatchConfig,
): NormalizedSourceEvent | null {
  switch (eventName) {
    case "release":
      return normalizeRelease(payload, watchConfig);
    case "pull_request":
      return normalizePullRequest(payload, watchConfig);
    case "push":
      return normalizePush(payload, watchConfig);
    case "issues":
      return normalizeIssue(payload, watchConfig);
    default:
      return null;
  }
}

function normalizeRelease(
  payload: GithubPayload,
  watch: WatchConfig,
): NormalizedSourceEvent | null {
  if (!watch.is_watching_releases) return null;
  if (payload.action !== "published") return null;
  const release = payload.release;
  if (!release?.tag_name) return null;
  return {
    eventKind: "release_published",
    externalRef: `release:${release.tag_name}`,
    occurredAt: release.published_at ?? new Date().toISOString(),
    payload: {
      tag_name: release.tag_name,
      name: release.name ?? null,
      body: release.body ?? null,
      html_url: release.html_url ?? null,
      is_prerelease: Boolean(release.prerelease),
    },
  };
}

function normalizePullRequest(
  payload: GithubPayload,
  watch: WatchConfig,
): NormalizedSourceEvent | null {
  if (!watch.is_watching_default_branch_merges) return null;
  if (payload.action !== "closed") return null;
  const pr = payload.pull_request;
  if (!pr?.merged) return null;
  // Only merges into the default branch count as product changes.
  if (pr.base?.ref !== payload.repository?.default_branch) return null;
  return {
    eventKind: "pull_request_merged",
    externalRef: `pr:${pr.number}`,
    occurredAt: pr.merged_at ?? new Date().toISOString(),
    payload: {
      number: pr.number,
      title: pr.title ?? null,
      body: pr.body ?? null,
      html_url: pr.html_url ?? null,
      merge_commit_sha: pr.merge_commit_sha ?? null,
      changed_files: pr.changed_files ?? null,
      labels: (pr.labels ?? []).map((l: GithubPayload) => l?.name).filter(Boolean),
    },
  };
}

function normalizePush(
  payload: GithubPayload,
  watch: WatchConfig,
): NormalizedSourceEvent | null {
  if (!watch.is_watching_default_branch_merges) return null;
  const defaultBranch = payload.repository?.default_branch;
  if (!defaultBranch || payload.ref !== `refs/heads/${defaultBranch}`) {
    return null;
  }
  if (!payload.head_commit) return null;
  // Merge-commit pushes duplicate pull_request_merged; only direct pushes
  // (no associated merged PR) matter here. GitHub does not flag this, so we
  // record the push and let clustering dedupe by commit sha.
  return {
    eventKind: "push_default_branch",
    externalRef: `push:${payload.head_commit.id}`,
    occurredAt: payload.head_commit.timestamp ?? new Date().toISOString(),
    payload: {
      head_sha: payload.head_commit.id,
      message: payload.head_commit.message ?? null,
      html_url: payload.head_commit.url ?? null,
      commit_count: Array.isArray(payload.commits) ? payload.commits.length : 1,
      modified: (payload.head_commit.modified ?? []).slice(0, 50),
      added: (payload.head_commit.added ?? []).slice(0, 50),
    },
  };
}

function normalizeIssue(
  payload: GithubPayload,
  watch: WatchConfig,
): NormalizedSourceEvent | null {
  if (!watch.is_watching_labeled_issues) return null;
  if (payload.action !== "labeled") return null;
  const issue = payload.issue;
  const labelName = payload.label?.name;
  if (!issue?.number || !labelName) return null;
  const watchedLabels = watch.issue_labels ?? [];
  if (watchedLabels.length > 0 && !watchedLabels.includes(labelName)) {
    return null;
  }
  return {
    eventKind: "issue_labeled",
    externalRef: `issue:${issue.number}:${labelName}`,
    occurredAt: new Date().toISOString(),
    payload: {
      number: issue.number,
      title: issue.title ?? null,
      body: issue.body ?? null,
      html_url: issue.html_url ?? null,
      label: labelName,
    },
  };
}
