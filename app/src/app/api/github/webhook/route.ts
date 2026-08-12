/**
 * GitHub App webhook receiver. Cheap and synchronous: verify the signature,
 * keep installation state in sync, and normalize watched source events into
 * target_events inbox rows (no AI here — scans interpret the inbox).
 *
 * Returns 2xx fast so GitHub does not retry; signature failures 401.
 */
import { NextResponse, type NextRequest } from "next/server";

import { verifyGithubSignature } from "@/github/webhook-verify";
import type { Json } from "@/lib/database.types";
import { requireEnv } from "@/lib/env";
import { adminClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/jobs/queue";
import {
  normalizeGithubEvent,
  type WatchConfig,
} from "@/radar/normalize";
import { recordEvent } from "@/services/record-event";

export async function POST(request: NextRequest) {
  const env = requireEnv("GITHUB_APP_WEBHOOK_SECRET");
  const rawBody = await request.text();

  const isValid = verifyGithubSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    env.GITHUB_APP_WEBHOOK_SECRET,
  );
  if (!isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const eventName = request.headers.get("x-github-event") ?? "";
  const deliveryId = request.headers.get("x-github-delivery") ?? null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    if (eventName === "installation") {
      await handleInstallation(payload);
    } else if (eventName === "installation_repositories") {
      await handleInstallationRepositories(payload);
    } else {
      await handleTargetEvent(eventName, payload, deliveryId);
    }
  } catch (err) {
    // Log but acknowledge: GitHub redelivery would not fix an internal bug,
    // and deliveries are replayable from the app's Advanced tab.
    console.error(`[github-webhook] failed handling ${eventName}:`, err);
  }

  return NextResponse.json({ success: true });
}

type AnyPayload = Record<string, any>;

async function handleInstallation(payload: AnyPayload) {
  const installationId: number | undefined = payload.installation?.id;
  if (!installationId) return;
  const admin = adminClient();

  const { data: row } = await admin
    .from("github_installations")
    .select("id, organization_id")
    .eq("github_installation_id", installationId)
    .maybeSingle();
  // Unknown installation (e.g. `created` racing the setup callback, or an
  // install that never went through our connect flow): nothing to update.
  if (!row) return;

  const action = payload.action as string;
  const patch =
    action === "deleted"
      ? { is_active: false }
      : action === "suspend"
        ? { is_active: false, suspended_at: new Date().toISOString() }
        : action === "unsuspend"
          ? { is_active: true, suspended_at: null }
          : null;
  if (!patch) return;

  await admin
    .from("github_installations")
    .update(patch)
    .eq("github_installation_id", installationId);

  await recordEvent({
    organizationId: row.organization_id,
    eventType: `github_installation_${action}`,
    subjectType: "github_installation",
    subjectId: String(installationId),
    actorKind: "system",
  });
}

async function handleInstallationRepositories(payload: AnyPayload) {
  const installationId: number | undefined = payload.installation?.id;
  if (!installationId) return;
  const removed: AnyPayload[] = payload.repositories_removed ?? [];
  if (removed.length === 0) return;
  const admin = adminClient();

  const { data: row } = await admin
    .from("github_installations")
    .select("organization_id")
    .eq("github_installation_id", installationId)
    .maybeSingle();
  if (!row) return;

  const fullNames = removed.map((r) => r.full_name).filter(Boolean);
  if (fullNames.length === 0) return;

  await admin
    .from("radar_targets")
    .update({ is_active: false })
    .eq("organization_id", row.organization_id)
    .in("github_repo_full_name", fullNames);

  await recordEvent({
    organizationId: row.organization_id,
    eventType: "github_repos_removed",
    subjectType: "github_installation",
    subjectId: String(installationId),
    actorKind: "system",
    payload: { repos: fullNames },
  });
}

/**
 * Deliveries route to radar_targets (the emitters' addresses inside radars);
 * matched events land in the target_events inbox mechanically. A
 * debounce-light event-triggered scan is enqueued per affected radar — the
 * scan is the interpretation stage, never this receiver.
 */
async function handleTargetEvent(
  eventName: string,
  payload: AnyPayload,
  deliveryId: string | null,
) {
  const installationId: number | undefined = payload.installation?.id;
  const repoFullName: string | undefined = payload.repository?.full_name;
  if (!installationId || !repoFullName) return;

  const admin = adminClient();
  const { data: installation } = await admin
    .from("github_installations")
    .select("organization_id, is_active")
    .eq("github_installation_id", installationId)
    .maybeSingle();
  if (!installation?.is_active) return;

  const { data: targets } = await admin
    .from("radar_targets")
    .select("id, radar_id, config, radars!inner(id, is_active, scan_strategies)")
    .eq("organization_id", installation.organization_id)
    .eq("github_installation_id", installationId)
    .eq("github_repo_full_name", repoFullName)
    .eq("is_active", true);
  if (!targets || targets.length === 0) return;

  for (const target of targets) {
    const radar = target.radars as unknown as {
      id: string;
      is_active: boolean;
      scan_strategies: string[];
    };
    if (!radar.is_active) continue;
    if (!radar.scan_strategies.includes("target_emitted_events")) continue;

    const normalized = normalizeGithubEvent(
      eventName,
      payload,
      (target.config ?? {}) as WatchConfig,
    );
    if (!normalized) continue;

    const { error } = await admin.from("target_events").upsert(
      {
        organization_id: installation.organization_id,
        radar_id: target.radar_id,
        radar_target_id: target.id,
        event_kind: normalized.eventKind,
        external_ref: normalized.externalRef,
        delivery_ref: deliveryId,
        payload: normalized.payload as Json,
        occurred_at: normalized.occurredAt,
      },
      { onConflict: "radar_target_id,external_ref", ignoreDuplicates: true },
    );
    if (error) {
      console.error("[github-webhook] inbox insert failed:", error);
      continue;
    }

    // Debounce-light: the scan exits immediately when a prior scan already
    // consumed the inbox, so redundant enqueues are cheap no-ops.
    await enqueueJob("radar", "run_scan", {
      radarId: target.radar_id,
      trigger: "target_events",
    });
  }
}
