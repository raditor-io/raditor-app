/**
 * ai_briefing strategy: one web-grounded hunt per scan, driven by the
 * radar's directive. The model returns JSON findings with evidence URLs;
 * evidence-free findings are dropped, and already-reconciled re-finds are
 * skipped via the (radar_id, external_ref) unique key with ignoreDuplicates
 * (the known-signals digest in the prompt is the first line of defense).
 */
import { aiChat, parseJsonResponse } from "@/ai/router";
import type { Database, Json } from "@/lib/database.types";
import { adminClient } from "@/lib/supabase/server";
import {
  briefingResponseSchema,
  buildBriefingPrompt,
  validateFindings,
} from "@/radar/briefing";
import { deriveDedupKey } from "@/radar/dedup";

type RadarRow = Database["public"]["Tables"]["radars"]["Row"];
type RadarTargetRow = Database["public"]["Tables"]["radar_targets"]["Row"];

const KNOWN_SIGNALS_LIMIT = 20;

export interface RunAiBriefingInput {
  radar: RadarRow;
  scanId: string;
  targets: RadarTargetRow[];
}

export interface AiBriefingResult {
  briefingSummaryMd: string;
  outputsCreated: number;
  findingsDropped: number;
  duplicatesSkipped: number;
}

export async function runAiBriefing(
  input: RunAiBriefingInput,
): Promise<AiBriefingResult> {
  const { radar, scanId, targets } = input;
  const admin = adminClient();

  const { data: knownSignals } = await admin
    .from("signals")
    .select("title, dedup_key, occurred_at")
    .eq("radar_id", radar.id)
    .order("created_at", { ascending: false })
    .limit(KNOWN_SIGNALS_LIMIT);

  const messages = buildBriefingPrompt({
    directiveMd: radar.directive_md,
    targets: targets.map((target) => ({
      targetKind: target.target_kind,
      repoFullName: target.github_repo_full_name,
    })),
    lastScannedAt: radar.last_scanned_at,
    knownSignals: (knownSignals ?? []).map((signal) => ({
      title: signal.title,
      dedupKey: signal.dedup_key,
      occurredAt: signal.occurred_at,
    })),
    now: new Date(),
  });

  const result = await aiChat({
    organizationId: radar.organization_id,
    functionality: "scan_briefing",
    scanId,
    isJsonResponse: true,
    isWebSearchEnabled: true,
    maxTokens: 4_000,
    messages,
  });

  const response = briefingResponseSchema.parse(
    parseJsonResponse(result.content),
  );
  const { accepted, droppedForMissingEvidence } = validateFindings(response);

  let outputsCreated = 0;
  for (const finding of accepted) {
    const primaryUrl = finding.evidence[0]?.url ?? null;
    const dedupKey = deriveDedupKey({
      outputKind: finding.kind,
      externalRef: finding.title.toLowerCase().slice(0, 120),
      url: primaryUrl,
    });

    const occurredAt =
      finding.occurred_at && !Number.isNaN(Date.parse(finding.occurred_at))
        ? new Date(finding.occurred_at).toISOString()
        : new Date().toISOString();

    // ignoreDuplicates: a re-find of an already-reconciled fact must NOT
    // resurrect (reconciled outputs keep is_reconciled = true).
    const { data: inserted, error } = await admin
      .from("scan_outputs")
      .upsert(
        {
          organization_id: radar.organization_id,
          radar_id: radar.id,
          scan_id: scanId,
          radar_target_id: null,
          output_kind: finding.kind,
          external_ref: dedupKey,
          title: finding.title,
          body: finding.summary_md,
          url: primaryUrl,
          data: {
            kind: finding.kind,
            body_md: finding.body_md ?? "",
            evidence: finding.evidence,
            dedup_key: dedupKey,
          } as unknown as Json,
          occurred_at: occurredAt,
        },
        { onConflict: "radar_id,external_ref", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    outputsCreated += inserted?.length ?? 0;
  }

  return {
    briefingSummaryMd: response.summary_md,
    outputsCreated,
    findingsDropped: droppedForMissingEvidence,
    duplicatesSkipped: accepted.length - outputsCreated,
  };
}
