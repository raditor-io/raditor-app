/**
 * Reconciliation: unreconciled scan_outputs of one radar become radar-bound
 * signals, deduped on (radar_id, dedup_key) — a re-sighting updates the
 * existing signal. Cross-radar collection is the feeds layer's job.
 */
import type { Database, Json } from "@/lib/database.types";
import { adminClient } from "@/lib/supabase/server";
import { deriveDedupKey } from "@/radar/dedup";
import { recordEvent } from "@/services/record-event";

type RadarRow = Database["public"]["Tables"]["radars"]["Row"];
type RadarTargetRow = Database["public"]["Tables"]["radar_targets"]["Row"];

export interface ReconciledSignal {
  id: string;
  kind: string;
  title: string;
  summary_md: string;
}

export async function reconcileScanOutputs(input: {
  radar: RadarRow;
  targetsById: Map<string, RadarTargetRow>;
}): Promise<ReconciledSignal[]> {
  const { radar, targetsById } = input;
  const admin = adminClient();
  const reconciled: ReconciledSignal[] = [];

  const { data: unreconciled } = await admin
    .from("scan_outputs")
    .select("*")
    .eq("radar_id", radar.id)
    .eq("is_reconciled", false);

  for (const output of unreconciled ?? []) {
    const outputData = (output.data ?? {}) as {
      dedup_key?: string;
      body_md?: string;
      evidence?: unknown[];
    };
    const target = output.radar_target_id
      ? targetsById.get(output.radar_target_id)
      : undefined;

    const dedupKey =
      outputData.dedup_key ??
      deriveDedupKey({
        outputKind: output.output_kind,
        externalRef: output.external_ref,
        repoFullName: target?.github_repo_full_name,
        url: output.url,
      });

    const evidence =
      Array.isArray(outputData.evidence) && outputData.evidence.length > 0
        ? outputData.evidence
        : [
            {
              kind: output.output_kind,
              title: output.title,
              url: output.url,
              external_ref: output.external_ref,
            },
          ];

    const { data: signal, error: signalError } = await admin
      .from("signals")
      .upsert(
        {
          organization_id: radar.organization_id,
          radar_id: radar.id,
          dedup_key: dedupKey,
          kind: output.output_kind,
          title: output.title,
          summary_md: output.body ?? output.title,
          body_md: outputData.body_md ?? "",
          evidence: evidence as unknown as Json,
          occurred_at: output.occurred_at,
        },
        { onConflict: "radar_id,dedup_key" },
      )
      .select("id")
      .single();
    if (signalError) throw signalError;

    await admin
      .from("scan_outputs")
      .update({ signal_id: signal.id, is_reconciled: true })
      .eq("id", output.id);

    await recordEvent({
      organizationId: radar.organization_id,
      eventType: "signal_created",
      subjectType: "signal",
      subjectId: signal.id,
      actorKind: "system",
      payload: { dedup_key: dedupKey, radar_id: radar.id },
    });

    reconciled.push({
      id: signal.id,
      kind: output.output_kind,
      title: output.title,
      summary_md: output.body ?? output.title,
    });
  }

  return reconciled;
}
