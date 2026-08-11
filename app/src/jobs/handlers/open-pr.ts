/**
 * open_suggestion_pr: push an accepted suggestion's drafted files to a
 * raditor/<short-id> branch and open one PR (one PR per suggestion bundle).
 * The path allowlist is re-checked here (defense in depth). Idempotent: an
 * existing github_pull_requests row for the suggestion short-circuits.
 */
import { z } from "zod";

import {
  commitFileToBranch,
  createPullRequest,
  ensureBranch,
} from "@/github/api";
import { assertPathsAllowed } from "@/github/path-policy";
import { adminClient } from "@/lib/supabase/server";
import { buildPrBody } from "@/publish/pr-body";
import { registerJob } from "@/jobs/registry";
import { recordEvent } from "@/services/record-event";

export const openPrSchema = z.object({
  suggestionId: z.uuid(),
});

async function handleOpenPr(payload: { suggestionId: string }) {
  const { suggestionId } = payload;
  const admin = adminClient();

  const { data: existing } = await admin
    .from("github_pull_requests")
    .select("id")
    .eq("suggestion_id", suggestionId)
    .maybeSingle();
  if (existing) return;

  const { data: suggestion } = await admin
    .from("suggestions")
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();
  if (!suggestion || suggestion.status !== "accepted") return;

  const { data: project } = await admin
    .from("projects")
    .select("*")
    .eq("id", suggestion.project_id)
    .maybeSingle();
  if (
    !project?.deploy_repo_full_name ||
    !project.deploy_github_installation_id
  ) {
    return;
  }

  const { data: drafts } = await admin
    .from("content_drafts")
    .select("*")
    .eq("suggestion_id", suggestionId);
  if (!drafts || drafts.length === 0) return;

  const filePaths = drafts.map((d) => d.file_path);
  assertPathsAllowed(filePaths, project.deploy_path_allowlist);

  const installationId = Number(project.deploy_github_installation_id);
  const repo = project.deploy_repo_full_name;
  const branchName = `raditor/${suggestionId.slice(0, 8)}`;

  await ensureBranch(
    installationId,
    repo,
    branchName,
    project.deploy_base_branch,
  );

  for (const draft of drafts) {
    const committedSha = await commitFileToBranch(
      installationId,
      repo,
      branchName,
      draft.file_path,
      draft.draft_content,
      `content: ${suggestion.title}`,
    );
    await admin
      .from("content_drafts")
      .update({ committed_git_blob_sha: committedSha })
      .eq("id", draft.id);
  }

  const { data: signal } = suggestion.signal_id
    ? await admin
        .from("signals")
        .select("evidence")
        .eq("id", suggestion.signal_id)
        .maybeSingle()
    : { data: null };
  const evidence = (signal?.evidence ?? []) as Array<{
    title?: string | null;
    url?: string | null;
  }>;

  const pr = await createPullRequest(installationId, repo, {
    title: suggestion.title,
    body: buildPrBody({
      signalSummaryMd: suggestion.signal_summary_md,
      recommendationMd: suggestion.recommendation_md,
      reasonMd: suggestion.reason_md,
      evidence,
      filePaths,
    }),
    head: branchName,
    base: project.deploy_base_branch,
  });

  const { error } = await admin.from("github_pull_requests").insert({
    organization_id: suggestion.organization_id,
    project_id: suggestion.project_id,
    suggestion_id: suggestionId,
    repo_full_name: repo,
    pr_number: pr.prNumber,
    branch_name: branchName,
    head_commit_sha: pr.headSha,
  });
  if (error) throw error;

  await recordEvent({
    organizationId: suggestion.organization_id,
    eventType: "pull_request_opened",
    subjectType: "suggestion",
    subjectId: suggestionId,
    actorKind: "agent",
    actorId: suggestion.editor_agent_id ?? undefined,
    payload: { repo, pr_number: pr.prNumber, url: pr.htmlUrl },
  });
}

export function registerOpenPr(): void {
  registerJob("open_suggestion_pr", {
    schema: openPrSchema,
    handler: handleOpenPr,
  });
}
