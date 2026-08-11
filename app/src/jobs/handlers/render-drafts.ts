/**
 * render_suggestion_drafts: turn an accepted suggestion's graph-impact file
 * operations into complete drafted files (content_draft functionality), then
 * hand off to open_suggestion_pr. Path allowlist enforced here AND again at
 * PR open (defense in depth). Idempotent: drafts upsert per (suggestion,
 * file_path); re-runs overwrite drafts, never duplicate.
 */
import { z } from "zod";

import { buildDraftMessages, unfenceFileContent } from "@/ai/prompts/draft";
import type { ProjectBriefing } from "@/ai/prompts/evaluate";
import { aiChat } from "@/ai/router";
import { wrapUntrusted } from "@/ai/untrusted";
import { getFileContent } from "@/github/api";
import { assertPathsAllowed } from "@/github/path-policy";
import { slugify } from "@/lib/schemas/project-config";
import { adminClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/jobs/queue";
import { registerJob } from "@/jobs/registry";
import { recordEvent } from "@/services/record-event";

export const renderDraftsSchema = z.object({
  suggestionId: z.uuid(),
});

interface FileOperation {
  op: string;
  file_path?: string;
  url_path?: string;
  title?: string;
  summary_of_change?: string;
}

async function handleRenderDrafts(payload: { suggestionId: string }) {
  const { suggestionId } = payload;
  const admin = adminClient();

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
  if (!project) return;
  if (!project.deploy_repo_full_name || !project.deploy_github_installation_id) {
    await recordEvent({
      organizationId: suggestion.organization_id,
      eventType: "draft_render_failed",
      subjectType: "suggestion",
      subjectId: suggestionId,
      actorKind: "system",
      payload: { reason: "no_deploy_target" },
    });
    return;
  }

  const { data: editor } = await admin
    .from("editor_agents")
    .select("*")
    .eq("id", suggestion.editor_agent_id ?? "")
    .maybeSingle();
  const routing = (editor?.model_config ?? {}) as {
    routing?: Partial<Record<string, string>>;
  };

  // File operations from graph impact; fall back to one new page under the
  // first allowlisted folder when the model emitted none.
  const operations = (
    (suggestion.graph_impact as { operations?: FileOperation[] })?.operations ??
    []
  ).filter(
    (op) =>
      (op.op === "create_page" || op.op === "update_page") && op.file_path,
  );
  if (operations.length === 0) {
    const baseDir = project.deploy_path_allowlist[0];
    if (!baseDir) {
      await recordEvent({
        organizationId: suggestion.organization_id,
        eventType: "draft_render_failed",
        subjectType: "suggestion",
        subjectId: suggestionId,
        actorKind: "system",
        payload: { reason: "no_file_operations_and_no_allowlist" },
      });
      return;
    }
    operations.push({
      op: "create_page",
      file_path: `${baseDir.replace(/\/+$/, "")}/${slugify(suggestion.title)}.md`,
      title: suggestion.title,
    });
  }

  const filePaths = operations.map((op) => op.file_path!) ;
  assertPathsAllowed(filePaths, project.deploy_path_allowlist);

  const { data: signal } = suggestion.signal_id
    ? await admin
        .from("signals")
        .select("evidence")
        .eq("id", suggestion.signal_id)
        .maybeSingle()
    : { data: null };
  const evidenceEntries = (signal?.evidence ?? []) as Array<{
    title?: string;
    body?: string | null;
  }>;
  const evidenceText = evidenceEntries
    .map((e) => [e.title, e.body].filter(Boolean).join("\n"))
    .join("\n---\n");

  const briefing: ProjectBriefing = {
    displayName: project.display_name,
    siteType: project.site_type,
    purposeMd: project.purpose_md,
    doNotWriteMd: project.do_not_write_md,
    editorialMemoryMd: project.editorial_memory_md,
    goals: [],
  };

  for (const operation of operations) {
    const existing =
      operation.op === "update_page"
        ? await getFileContent(
            Number(project.deploy_github_installation_id),
            project.deploy_repo_full_name,
            operation.file_path!,
            project.deploy_base_branch,
          )
        : null;

    const result = await aiChat({
      organizationId: suggestion.organization_id,
      projectId: suggestion.project_id,
      editorAgentId: suggestion.editor_agent_id ?? undefined,
      suggestionId,
      functionality: "content_draft",
      modelOverride: routing.routing?.content_draft,
      maxTokens: 4000,
      messages: buildDraftMessages({
        personaMd: editor?.persona_md ?? "",
        project: briefing,
        suggestion: {
          title: suggestion.title,
          signalSummaryMd: suggestion.signal_summary_md,
          recommendationMd: suggestion.recommendation_md,
          reasonMd: suggestion.reason_md,
        },
        operation,
        wrappedEvidence: wrapUntrusted(
          evidenceText || suggestion.signal_summary_md,
          "signal evidence",
        ),
        wrappedExistingContent: existing
          ? wrapUntrusted(existing.content, "existing file content")
          : undefined,
        todayIso: new Date().toISOString().slice(0, 10),
      }),
    });

    const { error } = await admin.from("content_drafts").upsert(
      {
        organization_id: suggestion.organization_id,
        project_id: suggestion.project_id,
        suggestion_id: suggestionId,
        file_path: operation.file_path!,
        draft_content: unfenceFileContent(result.content),
        base_git_blob_sha: existing?.sha ?? null,
      },
      { onConflict: "suggestion_id,file_path" },
    );
    if (error) throw error;
  }

  await recordEvent({
    organizationId: suggestion.organization_id,
    eventType: "drafts_rendered",
    subjectType: "suggestion",
    subjectId: suggestionId,
    actorKind: "agent",
    actorId: suggestion.editor_agent_id ?? undefined,
    payload: { file_paths: filePaths },
  });

  await enqueueJob("publish", "open_suggestion_pr", { suggestionId });
}

export function registerRenderDrafts(): void {
  registerJob("render_suggestion_drafts", {
    schema: renderDraftsSchema,
    handler: handleRenderDrafts,
  });
}
