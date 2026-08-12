/**
 * run_scan: one sweep of one radar — the ONLY interpretation stage of the
 * radar pipeline. Orchestrates the enabled strategies, reconciles outputs
 * into radar-bound signals, fans them out into feeds, and always records an
 * outcome on the scan row (summary_md even for zero-signal scans,
 * error_message on failure).
 *
 * - target_emitted_events: consume the unconsumed target_events inbox
 *   (radar/strategies/target-events.ts).
 * - ai_briefing: web-grounded hunt driven by the directive
 *   (radar/strategies/ai-briefing.ts).
 *
 * Idempotent: inbox consumption is guarded by consumed_by_scan_id, outputs
 * by (radar_id, external_ref), signals by (radar_id, dedup_key), feed items
 * by (feed_id, signal_id).
 */
import { z } from "zod";

import type { Json } from "@/lib/database.types";
import { adminClient } from "@/lib/supabase/server";
import { registerJob } from "@/jobs/registry";
import { fanOutSignalsToFeeds } from "@/feeds/fan-out";
import { reconcileScanOutputs } from "@/radar/reconcile";
import { buildScanSummary } from "@/radar/scan-summary";
import { runAiBriefing } from "@/radar/strategies/ai-briefing";
import { consumeTargetEvents } from "@/radar/strategies/target-events";

export const runScanSchema = z.object({
  radarId: z.uuid(),
  trigger: z.enum(["interval", "target_events"]),
});

const ERROR_MESSAGE_MAX_LENGTH = 2_000;

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
    .from("target_events")
    .select("*")
    .eq("radar_id", radarId)
    .is("consumed_by_scan_id", null)
    .order("occurred_at", { ascending: true })
    .limit(100);
  const hasInboxWork =
    radar.scan_strategies.includes("target_emitted_events") &&
    (pendingEvents?.length ?? 0) > 0;
  if (trigger === "target_events" && !hasInboxWork) return;

  const strategiesUsed =
    trigger === "target_events"
      ? ["target_emitted_events"]
      : radar.scan_strategies;

  const { data: scan, error: scanError } = await admin
    .from("scans")
    .insert({
      organization_id: radar.organization_id,
      radar_id: radarId,
      trigger,
      strategies_used: strategiesUsed,
    })
    .select("id")
    .single();
  if (scanError) throw scanError;

  const stats = {
    events_consumed: 0,
    outputs_created: 0,
    signals_created: 0,
    briefing_findings_dropped: 0,
    feed_items_created: 0,
    deliveries_enqueued: 0,
    strategies_skipped: [] as string[],
  };
  const warnings: string[] = [];
  let briefingSummaryMd: string | null = null;
  let signalTitles: string[] = [];

  try {
    if (hasInboxWork) {
      const inbox = await consumeTargetEvents({
        radar,
        scanId: scan.id,
        targetsById,
        pendingEvents: pendingEvents ?? [],
      });
      stats.events_consumed = inbox.eventsConsumed;
      stats.outputs_created += inbox.outputsCreated;
    }

    if (trigger === "interval") {
      for (const strategy of radar.scan_strategies) {
        if (strategy === "target_emitted_events") continue;
        if (strategy === "ai_briefing") {
          const briefing = await runAiBriefing({
            radar,
            scanId: scan.id,
            targets: targets ?? [],
          });
          briefingSummaryMd = briefing.briefingSummaryMd;
          stats.outputs_created += briefing.outputsCreated;
          stats.briefing_findings_dropped = briefing.findingsDropped;
          continue;
        }
        // Unknown/legacy strategy values (e.g. fetched_websites) are skipped.
        stats.strategies_skipped.push(strategy);
      }
    }

    const signals = await reconcileScanOutputs({ radar, targetsById });
    stats.signals_created = signals.length;
    signalTitles = signals.map((signal) => signal.title);

    const fanOut = await fanOutSignalsToFeeds({
      organizationId: radar.organization_id,
      radarId,
      signals,
    });
    stats.feed_items_created = fanOut.feedItemsCreated;
    stats.deliveries_enqueued = fanOut.deliveriesEnqueued;

    await admin
      .from("scans")
      .update({
        status: "succeeded",
        stats: stats as unknown as Json,
        summary_md: buildScanSummary({
          strategiesUsed,
          stats,
          signalTitles,
          briefingSummaryMd,
          warnings,
        }),
        finished_at: new Date().toISOString(),
      })
      .eq("id", scan.id);
    await admin
      .from("radars")
      .update({ last_scanned_at: new Date().toISOString() })
      .eq("id", radarId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("scans")
      .update({
        status: "failed",
        stats: stats as unknown as Json,
        summary_md: buildScanSummary({
          strategiesUsed,
          stats,
          signalTitles,
          briefingSummaryMd,
          warnings,
        }),
        error_message: message.slice(0, ERROR_MESSAGE_MAX_LENGTH),
        finished_at: new Date().toISOString(),
      })
      .eq("id", scan.id);
    throw err;
  }
}

export function registerRunScan(): void {
  registerJob("run_scan", { schema: runScanSchema, handler: handleRunScan });
}
