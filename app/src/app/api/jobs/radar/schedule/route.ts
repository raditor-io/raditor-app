/**
 * Scheduler: checks the clock and enqueues whatever became due — run_scan
 * for interval-due radars, backstop scans for radars with unconsumed inbox
 * events (covers a lost event-triggered enqueue), and re-enqueued
 * cadence-deferred evaluations. Performs no processing itself; the
 * /api/jobs/radar/process endpoint executes the queue. Called by Vercel
 * cron (GET, Bearer CRON_SECRET).
 */
import { NextResponse, type NextRequest } from "next/server";

import { enqueueJob } from "@/jobs/queue";
import { requireEnv } from "@/lib/env";
import { adminClient } from "@/lib/supabase/server";

async function schedule(request: NextRequest) {
  const env = requireEnv("CRON_SECRET");
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = adminClient();
  const scanRadarIds = new Set<string>();

  // Interval-due radars (only meaningful once sweep strategies execute, but
  // harmless now: an interval scan with an empty inbox just records stats).
  const intervalCutoff = new Date().toISOString();
  const { data: dueRadars } = await admin
    .from("radars")
    .select("id, last_scanned_at, scan_interval_minutes")
    .eq("is_active", true)
    .limit(500);
  for (const radar of dueRadars ?? []) {
    const last = radar.last_scanned_at
      ? new Date(radar.last_scanned_at).getTime()
      : 0;
    const dueAt = last + radar.scan_interval_minutes * 60_000;
    if (dueAt <= new Date(intervalCutoff).getTime()) {
      scanRadarIds.add(radar.id);
    }
  }

  // Backstop: unconsumed inbox events whose event-triggered scan got lost.
  const { data: pendingEvents } = await admin
    .from("radar_target_events")
    .select("radar_id")
    .is("consumed_by_scan_id", null)
    .limit(500);
  for (const row of pendingEvents ?? []) scanRadarIds.add(row.radar_id);

  for (const radarId of scanRadarIds) {
    await enqueueJob("radar", "run_scan", { radarId, trigger: "interval" });
  }

  // Cadence-deferred evaluations retry on every scheduler run.
  const { data: deferred } = await admin
    .from("signal_evaluations")
    .select("signal_id, project_id")
    .eq("status", "deferred")
    .limit(200);
  for (const row of deferred ?? []) {
    await enqueueJob("radar", "evaluate_signal", {
      signalId: row.signal_id,
      projectId: row.project_id,
    });
  }

  return NextResponse.json({
    scans_enqueued: scanRadarIds.size,
    deferred_retried: deferred?.length ?? 0,
  });
}

export async function GET(request: NextRequest) {
  return schedule(request);
}

export async function POST(request: NextRequest) {
  return schedule(request);
}
