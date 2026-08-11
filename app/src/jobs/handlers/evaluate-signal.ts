/**
 * evaluate_signal: one editor agent evaluates one signal for one project.
 * Order: cadence check (cheap, no AI) → relevance classification → four-part
 * suggestion draft. AI/parse failures mark the evaluation failed instead of
 * retrying (retries would re-spend tokens on a deterministic failure).
 * Idempotent: an evaluation that already reached a terminal state returns
 * immediately.
 */
import { z } from "zod";

import {
  buildRelevanceMessages,
  buildSuggestionMessages,
  RELEVANCE_THRESHOLD,
  relevanceResponseSchema,
  suggestionResponseSchema,
  type ProjectBriefing,
  type SignalContext,
} from "@/ai/prompts/evaluate";
import { aiChat, parseJsonResponse } from "@/ai/router";
import { wrapUntrusted } from "@/ai/untrusted";
import type { Json } from "@/lib/database.types";
import { intervalBucket, type SuggestionInterval } from "@/lib/time-buckets";
import { adminClient } from "@/lib/supabase/server";
import { registerJob } from "@/jobs/registry";
import { recordEvent } from "@/services/record-event";

export const evaluateSignalSchema = z.object({
  signalId: z.uuid(),
  projectId: z.uuid(),
});

interface RoutingConfig {
  routing?: Partial<Record<string, string>>;
}

async function handleEvaluateSignal(payload: {
  signalId: string;
  projectId: string;
}) {
  const { signalId, projectId } = payload;
  const admin = adminClient();

  const { data: evaluation } = await admin
    .from("signal_evaluations")
    .select("*")
    .eq("signal_id", signalId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!evaluation) return;
  if (evaluation.status !== "pending" && evaluation.status !== "deferred") {
    return;
  }

  const [{ data: signal }, { data: project }] = await Promise.all([
    admin.from("signals").select("*").eq("id", signalId).maybeSingle(),
    admin.from("projects").select("*").eq("id", projectId).maybeSingle(),
  ]);
  if (!signal || !project) return;

  async function setEvaluation(patch: Record<string, unknown>) {
    await admin
      .from("signal_evaluations")
      .update({ ...patch, evaluated_at: new Date().toISOString() })
      .eq("id", evaluation!.id);
  }

  // 1. Cadence: emission respects interval + cap (PROJECT.md §7.2).
  const bucket = intervalBucket(
    new Date(),
    project.suggestion_interval as SuggestionInterval,
  );
  const { count } = await admin
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("interval_bucket", bucket);
  if ((count ?? 0) >= project.max_suggestions_per_interval) {
    await setEvaluation({ status: "deferred" });
    return;
  }

  // 2. Load the editor + briefing.
  const { data: editor } = await admin
    .from("editor_agents")
    .select("*")
    .eq("id", evaluation.editor_agent_id ?? "")
    .maybeSingle();
  const { data: goals } = await admin
    .from("project_goals")
    .select("title, body_md")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  const briefing: ProjectBriefing = {
    displayName: project.display_name,
    siteType: project.site_type,
    purposeMd: project.purpose_md,
    doNotWriteMd: project.do_not_write_md,
    editorialMemoryMd: project.editorial_memory_md,
    goals: (goals ?? []).map((g) => ({ title: g.title, bodyMd: g.body_md })),
  };

  const evidenceEntries = (signal.evidence ?? []) as Array<{
    title?: string;
    body?: string | null;
    url?: string | null;
  }>;
  const evidenceText = evidenceEntries
    .map((e) => [e.title, e.body].filter(Boolean).join("\n"))
    .join("\n---\n");
  const signalContext: SignalContext = {
    title: signal.title,
    summaryMd: signal.summary_md,
    wrappedEvidence: wrapUntrusted(evidenceText || signal.title, "signal evidence"),
  };

  const routing = (editor?.model_config ?? {}) as RoutingConfig;
  const personaMd = editor?.persona_md ?? "";

  try {
    // 3. Relevance classification.
    const relevanceResult = await aiChat({
      organizationId: evaluation.organization_id,
      projectId,
      editorAgentId: evaluation.editor_agent_id ?? undefined,
      functionality: "signal_evaluation",
      modelOverride: routing.routing?.signal_evaluation,
      isJsonResponse: true,
      maxTokens: 500,
      messages: buildRelevanceMessages(personaMd, briefing, signalContext),
    });
    const relevance = relevanceResponseSchema.parse(
      parseJsonResponse(relevanceResult.content),
    );

    if (relevance.relevance_score < RELEVANCE_THRESHOLD) {
      await setEvaluation({
        status: "skipped_irrelevant",
        relevance_score: Math.round(relevance.relevance_score),
        rationale_md: relevance.rationale,
      });
      return;
    }

    // 4. Draft the four-part suggestion.
    const draftResult = await aiChat({
      organizationId: evaluation.organization_id,
      projectId,
      editorAgentId: evaluation.editor_agent_id ?? undefined,
      functionality: "content_suggestion",
      modelOverride: routing.routing?.content_suggestion,
      isJsonResponse: true,
      maxTokens: 2000,
      messages: buildSuggestionMessages(
        personaMd,
        briefing,
        signalContext,
        relevance.rationale,
      ),
    });
    const draft = suggestionResponseSchema.parse(
      parseJsonResponse(draftResult.content),
    );

    const { data: suggestion, error: insertError } = await admin
      .from("suggestions")
      .insert({
        organization_id: evaluation.organization_id,
        project_id: projectId,
        editor_agent_id: evaluation.editor_agent_id,
        signal_id: signalId,
        sibling_group_id: signalId,
        title: draft.title,
        signal_summary_md: draft.signal_summary_md,
        recommendation_md: draft.recommendation_md,
        reason_md: draft.reason_md,
        graph_impact: draft.graph_impact as unknown as Json,
        interval_bucket: bucket,
        relevance_score: Math.round(relevance.relevance_score),
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    await setEvaluation({
      status: "suggested",
      relevance_score: Math.round(relevance.relevance_score),
      rationale_md: relevance.rationale,
      suggestion_id: suggestion.id,
    });

    await recordEvent({
      organizationId: evaluation.organization_id,
      eventType: "suggestion_created",
      subjectType: "suggestion",
      subjectId: suggestion.id,
      actorKind: "agent",
      actorId: evaluation.editor_agent_id ?? undefined,
      payload: { signal_id: signalId, project_id: projectId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[evaluate-signal] failed for signal ${signalId} project ${projectId}:`,
      message,
    );
    await setEvaluation({ status: "failed", error_message: message.slice(0, 500) });
  }
}

export function registerEvaluateSignal(): void {
  registerJob("evaluate_signal", {
    schema: evaluateSignalSchema,
    handler: handleEvaluateSignal,
  });
}
