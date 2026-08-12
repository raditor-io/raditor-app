/**
 * target_emitted_events strategy: consume the unconsumed target_events inbox
 * as a batch — enrich with real diffs where the event has them, summarize
 * cheaply, and upsert scan_outputs. Idempotent: inbox rows are guarded by
 * consumed_by_scan_id, outputs by (radar_id, external_ref).
 */
import { aiChat } from "@/ai/router";
import { wrapUntrusted } from "@/ai/untrusted";
import { getCommitDiffFiles, getPullRequestDiffFiles } from "@/github/api";
import type { Database, Json } from "@/lib/database.types";
import { adminClient } from "@/lib/supabase/server";
import { formatDiffForPrompt, type FormattedDiff } from "@/radar/enrich";

type RadarRow = Database["public"]["Tables"]["radars"]["Row"];
type RadarTargetRow = Database["public"]["Tables"]["radar_targets"]["Row"];
type TargetEventRow = Database["public"]["Tables"]["target_events"]["Row"];

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
    (target.config as { path_filters?: string[] } | null)?.path_filters ?? [];

  try {
    if (
      eventKind === "push_default_branch" &&
      typeof payload.head_sha === "string"
    ) {
      const files = await getCommitDiffFiles(
        Number(target.github_installation_id),
        target.github_repo_full_name,
        payload.head_sha,
      );
      return formatDiffForPrompt(files, { pathFilters });
    }
    if (
      eventKind === "pull_request_merged" &&
      typeof payload.number === "number"
    ) {
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

export interface ConsumeTargetEventsInput {
  radar: RadarRow;
  scanId: string;
  targetsById: Map<string, RadarTargetRow>;
  pendingEvents: TargetEventRow[];
}

export async function consumeTargetEvents(
  input: ConsumeTargetEventsInput,
): Promise<{ eventsConsumed: number; outputsCreated: number }> {
  const { radar, scanId, targetsById, pendingEvents } = input;
  const admin = adminClient();
  let eventsConsumed = 0;
  let outputsCreated = 0;

  for (const event of pendingEvents) {
    const eventPayload = (event.payload ?? {}) as InboxPayload;
    const { title, body, url } = extractFields(eventPayload);

    // Enrich with the actual code changes where the event has them.
    const diff = await fetchEventDiff(
      targetsById.get(event.radar_target_id),
      event.event_kind,
      eventPayload,
    );

    // Cheap AI summary with graceful fallback.
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
          functionality: "scan_summary",
          scanId,
          maxTokens: 400,
          messages: [
            {
              role: "system",
              content:
                "Summarize this change in 2-4 plain sentences for a monitoring radar, based on the message and the actual code changes. Focus on what is externally visible. No headings, no lists.",
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

    const { error: outputError } = await admin.from("scan_outputs").upsert(
      {
        organization_id: radar.organization_id,
        radar_id: radar.id,
        scan_id: scanId,
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
    );
    if (outputError) throw outputError;

    await admin
      .from("target_events")
      .update({ consumed_by_scan_id: scanId })
      .eq("id", event.id);
    eventsConsumed += 1;
    outputsCreated += 1;
  }

  return { eventsConsumed, outputsCreated };
}
