/**
 * run_scan: one sweep of one radar — the ONLY interpretation stage of the
 * radar pipeline. Per enabled strategy it looks at different material:
 *
 * - target_emitted_events: consume unconsumed radar_target_events (the raw
 *   inbox) as a batch → scan_outputs. Active today.
 * - ai_briefing / fetched_websites: declared, execute from Phase 7 (recorded
 *   as skipped in scan stats).
 *
 * Every output then reconciles into an org-level signal (dedupe on the
 * evidence-derived cluster key, so the same fact seen by radars of different
 * projects merges into ONE signal) and a signal_evaluation is created for
 * the radar's project. Idempotent: inbox consumption is guarded by
 * consumed_by_scan_id, outputs by (radar_id, external_ref), signals by
 * cluster_key, evaluations by (signal_id, project_id).
 */
import { z } from "zod";

import { aiChat } from "@/ai/router";
import { wrapUntrusted } from "@/ai/untrusted";
import {
  getCommitDiffFiles,
  getPullRequestDiffFiles,
} from "@/github/api";
import type { Database, Json } from "@/lib/database.types";
import { adminClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/jobs/queue";
import { registerJob } from "@/jobs/registry";
import { formatDiffForPrompt, type FormattedDiff } from "@/radar/enrich";
import { recordEvent } from "@/services/record-event";

type RadarTargetRow = Database["public"]["Tables"]["radar_targets"]["Row"];

export const runScanSchema = z.object({
  radarId: z.uuid(),
  trigger: z.enum(["interval", "target_events"]),
});

type InboxPayload = Record<string, unknown>;

/**
 * The normalizer stores kind-specific payload keys (release: tag_name/body,
 * PR/issue: title/body, push: message); flatten them into one shape here.
 */
function extractFields(payload: InboxPayload): {
  title: string;
  body: string | null;
  url: string | null;
} {
  const title =
    (payload.title as string) ??
    (payload.name as string) ??
    (payload.tag_name as string) ??
    (typeof payload.message === "string"
      ? payload.message.split("\n")[0]
      : null) ??
    "";
  const body =
    typeof payload.body === "string"
      ? payload.body
      : typeof payload.message === "string"
        ? payload.message
        : null;
  return {
    title: String(title).slice(0, 300) || "(untitled)",
    body,
    url: typeof payload.html_url === "string" ? payload.html_url : null,
  };
}

function outputTitle(eventKind: string, title: string): string {
  switch (eventKind) {
    case "release_published":
      return `Release ${title}`;
    case "pull_request_merged":
      return `Merged: ${title}`;
    case "push_default_branch":
      return `Pushed: ${title}`;
    case "issue_labeled":
      return `Issue labeled: ${title}`;
    default:
      return title;
  }
}

/**
 * Fetch the actual code changes behind an event (pushes and merged PRs):
 * commit messages are claims about a change; the diff is the evidence the
 * scan should summarize. Bounded by radar/enrich caps and the target's
 * path_filters; failures degrade to the unenriched path with a warning.
 */
async function fetchEventDiff(
  target: RadarTargetRow | undefined,
  eventKind: string,
  payload: InboxPayload,
): Promise<FormattedDiff | null> {
  if (!target?.github_installation_id || !target.github_repo_full_name) {
    return null;
  }
  const pathFilters =
    ((target.config as { path_filters?: string[] } | null)?.path_filters ??
      []);

  try {
    if (eventKind === "push_default_branch" && typeof payload.head_sha === "string") {
      const files = await getCommitDiffFiles(
        Number(target.github_installation_id),
        target.github_repo_full_name,
        payload.head_sha,
      );
      return formatDiffForPrompt(files, { pathFilters });
    }
    if (eventKind === "pull_request_merged" && typeof payload.number === "number") {
      const files = await getPullRequestDiffFiles(
        Number(target.github_installation_id),
        target.github_repo_full_name,
        payload.number,
      );
      return formatDiffForPrompt(files, { pathFilters });
    }
  } catch (err) {
    console.warn(
      `[run-scan] diff fetch failed for ${eventKind} on ${target.github_repo_full_name}:`,
      err,
    );
  }
  return null;
}

async function handleRunScan(payload: {
  radarId: string;
  trigger: "interval" | "target_events";
}) {
  const { radarId, trigger } = payload;
  const admin = adminClient();

  const { data: radar } = await admin
    .from("radars")
    .select("*")
    .eq("id", radarId)
    .maybeSingle();
  if (!radar?.is_active) return;

  const { data: targets } = await admin
    .from("radar_targets")
    .select("*")
    .eq("radar_id", radarId);
  const targetsById = new Map((targets ?? []).map((t) => [t.id, t]));

  // Debounce-light: event-triggered scans with an empty inbox are no-ops
  // (an earlier scan already consumed the events) and create no scan row.
  const { data: pendingEvents } = await admin
    .from("radar_target_events")
    .select("*")
    .eq("radar_id", radarId)
    .is("consumed_by_scan_id", null)
    .order("occurred_at", { ascending: true })
    .limit(100);
  const hasInboxWork =
    radar.scan_strategies.includes("target_emitted_events") &&
    (pendingEvents?.length ?? 0) > 0;
  if (trigger === "target_events" && !hasInboxWork) return;

  const { data: scan, error: scanError } = await admin
    .from("scans")
    .insert({
      organization_id: radar.organization_id,
      radar_id: radarId,
      trigger,
      strategies_used:
        trigger === "target_events"
          ? ["target_emitted_events"]
          : radar.scan_strategies,
    })
    .select("id")
    .single();
  if (scanError) throw scanError;

  const stats = {
    events_consumed: 0,
    outputs_created: 0,
    signals_created: 0,
    evaluations_enqueued: 0,
    strategies_skipped: [] as string[],
  };

  try {
    // --- Strategy: target_emitted_events (consume the inbox) ------------------
    if (hasInboxWork) {
      for (const event of pendingEvents ?? []) {
        const eventPayload = (event.payload ?? {}) as InboxPayload;
        const { title, body, url } = extractFields(eventPayload);

        // Enrich with the actual code changes where the event has them.
        const diff = await fetchEventDiff(
          targetsById.get(event.radar_target_id),
          event.event_kind,
          eventPayload,
        );

        // Cheap AI summary with graceful fallback (same posture as v0).
        let summary = title;
        const material = [
          title,
          body ?? "",
          diff?.text ? `Code changes:\n${diff.text}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
        if (body || diff?.text) {
          try {
            const result = await aiChat({
              organizationId: radar.organization_id,
              projectId: radar.project_id,
              functionality: "scan_summary",
              maxTokens: 400,
              messages: [
                {
                  role: "system",
                  content:
                    "Summarize this product change in 2-4 plain sentences for an editorial radar, based on the message and the actual code changes. Focus on what is user-visible. No headings, no lists.",
                },
                {
                  role: "user",
                  content: wrapUntrusted(material, `${event.event_kind} content`),
                },
              ],
            });
            summary = result.content.trim();
          } catch (err) {
            console.warn("[run-scan] summarize failed, using fallback:", err);
          }
        }

        const { data: output, error: outputError } = await admin
          .from("scan_outputs")
          .upsert(
            {
              organization_id: radar.organization_id,
              radar_id: radarId,
              scan_id: scan.id,
              radar_target_id: event.radar_target_id,
              output_kind: event.event_kind,
              external_ref: event.external_ref,
              title: outputTitle(event.event_kind, title),
              body: summary,
              url,
              data: {
                target_event_ids: [event.id],
                ...(diff ? { diff_stat: diff.stat } : {}),
              } as unknown as Json,
              occurred_at: event.occurred_at,
            },
            { onConflict: "radar_id,external_ref" },
          )
          .select("*")
          .single();
        if (outputError) throw outputError;

        await admin
          .from("radar_target_events")
          .update({ consumed_by_scan_id: scan.id })
          .eq("id", event.id);
        stats.events_consumed += 1;
        stats.outputs_created += 1;
      }
    }

    // --- Strategies arriving in Phase 7 ---------------------------------------
    for (const strategy of radar.scan_strategies) {
      if (strategy !== "target_emitted_events" && trigger === "interval") {
        stats.strategies_skipped.push(strategy);
      }
    }

    // --- Reconciliation: outputs → org-level signals + project evaluation ----
    const { data: unreconciled } = await admin
      .from("scan_outputs")
      .select("*")
      .eq("radar_id", radarId)
      .eq("is_reconciled", false);

    for (const output of unreconciled ?? []) {
      // Evidence-derived cluster key: identical across radars watching the
      // same target, which is what merges cross-project sightings.
      const target = output.radar_target_id
        ? targetsById.get(output.radar_target_id)
        : undefined;
      const clusterKey = target?.github_repo_full_name
        ? `${target.github_repo_full_name}:${output.output_kind}:${output.external_ref}`
        : `url:${output.url ?? output.external_ref}`;

      const { data: signal, error: signalError } = await admin
        .from("signals")
        .upsert(
          {
            organization_id: radar.organization_id,
            cluster_key: clusterKey,
            title: output.title,
            summary_md: output.body ?? output.title,
            evidence: [
              {
                kind: output.output_kind,
                title: output.title,
                url: output.url,
                external_ref: output.external_ref,
                body: output.body,
              },
            ] as unknown as Json,
            window_started_at: output.occurred_at,
            window_ended_at: output.occurred_at,
          },
          { onConflict: "organization_id,cluster_key" },
        )
        .select("id")
        .single();
      if (signalError) throw signalError;
      stats.signals_created += 1;

      await admin
        .from("scan_outputs")
        .update({ signal_id: signal.id, is_reconciled: true })
        .eq("id", output.id);

      // Project-bound fan-out: this radar's project evaluates the signal;
      // other projects join through their own radars' outputs.
      const { data: assignment } = await admin
        .from("editor_agent_assignments")
        .select("editor_agent_id")
        .eq("project_id", radar.project_id)
        .limit(1)
        .maybeSingle();
      if (assignment) {
        const { data: evaluation } = await admin
          .from("signal_evaluations")
          .upsert(
            {
              organization_id: radar.organization_id,
              signal_id: signal.id,
              project_id: radar.project_id,
              editor_agent_id: assignment.editor_agent_id,
            },
            { onConflict: "signal_id,project_id", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();
        if (evaluation) {
          await enqueueJob("radar", "evaluate_signal", {
            signalId: signal.id,
            projectId: radar.project_id,
          });
          stats.evaluations_enqueued += 1;
        }
      }

      await recordEvent({
        organizationId: radar.organization_id,
        eventType: "signal_created",
        subjectType: "signal",
        subjectId: signal.id,
        actorKind: "system",
        payload: { cluster_key: clusterKey, radar_id: radarId },
      });
    }

    await admin
      .from("scans")
      .update({
        status: "succeeded",
        stats: stats as unknown as Json,
        finished_at: new Date().toISOString(),
      })
      .eq("id", scan.id);
    await admin
      .from("radars")
      .update({ last_scanned_at: new Date().toISOString() })
      .eq("id", radarId);
  } catch (err) {
    await admin
      .from("scans")
      .update({
        status: "failed",
        stats: stats as unknown as Json,
        finished_at: new Date().toISOString(),
      })
      .eq("id", scan.id);
    throw err;
  }
}

export function registerRunScan(): void {
  registerJob("run_scan", { schema: runScanSchema, handler: handleRunScan });
}
