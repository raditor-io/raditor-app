import { describe, expect, it } from "vitest";

import { normalizeGithubEvent, type WatchConfig } from "./normalize";

const WATCH_ALL: WatchConfig = {
  is_watching_releases: true,
  is_watching_default_branch_merges: true,
  is_watching_labeled_issues: true,
  issue_labels: ["docs"],
};

const REPO = { default_branch: "main" };

describe("normalizeGithubEvent", () => {
  it("maps a published release", () => {
    const event = normalizeGithubEvent(
      "release",
      {
        action: "published",
        release: {
          tag_name: "v1.2.0",
          name: "v1.2.0",
          body: "Highlights",
          html_url: "https://github.com/a/b/releases/tag/v1.2.0",
          published_at: "2026-08-10T10:00:00Z",
          prerelease: false,
        },
      },
      WATCH_ALL,
    );
    expect(event).toMatchObject({
      eventKind: "release_published",
      externalRef: "release:v1.2.0",
      occurredAt: "2026-08-10T10:00:00Z",
    });
    expect(event?.payload).toMatchObject({ tag_name: "v1.2.0" });
  });

  it("ignores non-published release actions and unwatched releases", () => {
    const drafted = normalizeGithubEvent(
      "release",
      { action: "created", release: { tag_name: "v1" } },
      WATCH_ALL,
    );
    expect(drafted).toBeNull();
    const unwatched = normalizeGithubEvent(
      "release",
      { action: "published", release: { tag_name: "v1" } },
      { is_watching_releases: false },
    );
    expect(unwatched).toBeNull();
  });

  it("maps a merged PR into the default branch", () => {
    const event = normalizeGithubEvent(
      "pull_request",
      {
        action: "closed",
        repository: REPO,
        pull_request: {
          number: 42,
          merged: true,
          merged_at: "2026-08-10T11:00:00Z",
          base: { ref: "main" },
          title: "Add feature",
          html_url: "https://github.com/a/b/pull/42",
          merge_commit_sha: "abc123",
          labels: [{ name: "feature" }],
        },
      },
      WATCH_ALL,
    );
    expect(event).toMatchObject({
      eventKind: "pull_request_merged",
      externalRef: "pr:42",
    });
    expect(event?.payload).toMatchObject({ labels: ["feature"] });
  });

  it("ignores closed-unmerged PRs and merges into other branches", () => {
    const unmerged = normalizeGithubEvent(
      "pull_request",
      {
        action: "closed",
        repository: REPO,
        pull_request: { number: 1, merged: false, base: { ref: "main" } },
      },
      WATCH_ALL,
    );
    expect(unmerged).toBeNull();
    const featureBranch = normalizeGithubEvent(
      "pull_request",
      {
        action: "closed",
        repository: REPO,
        pull_request: { number: 2, merged: true, base: { ref: "develop" } },
      },
      WATCH_ALL,
    );
    expect(featureBranch).toBeNull();
  });

  it("maps a push to the default branch and ignores other refs", () => {
    const event = normalizeGithubEvent(
      "push",
      {
        ref: "refs/heads/main",
        repository: REPO,
        head_commit: {
          id: "sha-1",
          message: "fix: thing",
          timestamp: "2026-08-10T12:00:00Z",
          url: "https://github.com/a/b/commit/sha-1",
          modified: ["src/x.ts"],
          added: [],
        },
        commits: [{}, {}],
      },
      WATCH_ALL,
    );
    expect(event).toMatchObject({
      eventKind: "push_default_branch",
      externalRef: "push:sha-1",
    });
    expect(event?.payload).toMatchObject({ commit_count: 2 });

    const branch = normalizeGithubEvent(
      "push",
      { ref: "refs/heads/feature", repository: REPO, head_commit: { id: "x" } },
      WATCH_ALL,
    );
    expect(branch).toBeNull();
  });

  it("maps labeled issues only for watched labels", () => {
    const docs = normalizeGithubEvent(
      "issues",
      {
        action: "labeled",
        label: { name: "docs" },
        issue: { number: 7, title: "Explain X", html_url: "u" },
      },
      WATCH_ALL,
    );
    expect(docs).toMatchObject({
      eventKind: "issue_labeled",
      externalRef: "issue:7:docs",
    });

    const other = normalizeGithubEvent(
      "issues",
      {
        action: "labeled",
        label: { name: "bug" },
        issue: { number: 8 },
      },
      WATCH_ALL,
    );
    expect(other).toBeNull();
  });

  it("accepts any label when no label filter is configured", () => {
    const event = normalizeGithubEvent(
      "issues",
      {
        action: "labeled",
        label: { name: "anything" },
        issue: { number: 9 },
      },
      { is_watching_labeled_issues: true },
    );
    expect(event).not.toBeNull();
  });

  it("returns null for unknown event names", () => {
    expect(normalizeGithubEvent("star", {}, WATCH_ALL)).toBeNull();
  });
});
