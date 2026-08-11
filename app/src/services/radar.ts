/**
 * Radar service (scan-centric model): radars are project-bound missions with
 * a prose directive, targets, and enabled scan strategies. Reads for
 * members, configuration writes admin-only. Inbox/scan/output writes happen
 * in jobs via the service role.
 */
import type { Database, Json } from "@/lib/database.types";
import { listInstallationRepos, type GithubRepo } from "@/github/api";
import type { WatchConfigInput } from "@/lib/schemas/project-config";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireAdminContext, requireOrgContext } from "@/services/org";

export type RadarRow = Database["public"]["Tables"]["radars"]["Row"];
export type RadarTargetRow = Database["public"]["Tables"]["radar_targets"]["Row"];
export type ScanRow = Database["public"]["Tables"]["scans"]["Row"];
export type SignalRow = Database["public"]["Tables"]["signals"]["Row"];
export type EvaluationRow =
  Database["public"]["Tables"]["signal_evaluations"]["Row"];
export type InstallationRow =
  Database["public"]["Tables"]["github_installations"]["Row"];

export const SCAN_STRATEGIES = [
  "ai_briefing",
  "fetched_websites",
  "target_emitted_events",
] as const;
export type ScanStrategy = (typeof SCAN_STRATEGIES)[number];

/** Strategies that execute today; the others land in Phase 7. */
export const ACTIVE_SCAN_STRATEGIES: ScanStrategy[] = ["target_emitted_events"];

// --- Radars -------------------------------------------------------------------

export async function listRadars(projectId: string): Promise<RadarRow[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("radars")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getRadar(radarId: string): Promise<RadarRow | null> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("radars")
    .select("*")
    .eq("id", radarId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface CreateRadarInput {
  projectId: string;
  name: string;
  directiveMd: string;
  scanStrategies: ScanStrategy[];
  repoTarget?: {
    githubInstallationId: number;
    repoFullName: string;
    watchConfig: WatchConfigInput;
  };
}

export async function createRadar(input: CreateRadarInput): Promise<RadarRow> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  const { data: radar, error } = await supabase
    .from("radars")
    .insert({
      organization_id: ctx.organization.id,
      project_id: input.projectId,
      name: input.name,
      directive_md: input.directiveMd,
      scan_strategies: input.scanStrategies,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (input.repoTarget) {
    await addRepoTarget(radar.id, input.repoTarget);
  }

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "radar_created",
    subjectType: "radar",
    subjectId: radar.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { project_id: input.projectId, name: input.name },
  });

  return radar;
}

export async function updateRadar(
  radarId: string,
  patch: Partial<{
    name: string;
    directive_md: string;
    scan_strategies: string[];
    scan_interval_minutes: number;
    is_active: boolean;
  }>,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("radars")
    .update(patch)
    .eq("id", radarId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "radar_updated",
    subjectType: "radar",
    subjectId: radarId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { fields: Object.keys(patch) },
  });
}

// --- Targets ------------------------------------------------------------------

export async function listTargets(radarId: string): Promise<RadarTargetRow[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("radar_targets")
    .select("*")
    .eq("radar_id", radarId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addRepoTarget(
  radarId: string,
  input: {
    githubInstallationId: number;
    repoFullName: string;
    watchConfig: WatchConfigInput;
  },
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase.from("radar_targets").upsert(
    {
      organization_id: ctx.organization.id,
      radar_id: radarId,
      target_kind: "github_repo",
      github_installation_id: input.githubInstallationId,
      github_repo_full_name: input.repoFullName,
      config: input.watchConfig as unknown as Json,
      is_active: true,
    },
    { onConflict: "radar_id,github_repo_full_name" },
  );
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "radar_target_added",
    subjectType: "radar",
    subjectId: radarId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { target_kind: "github_repo", repo: input.repoFullName },
  });
}

export async function removeTarget(targetId: string): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("radar_targets")
    .update({ is_active: false })
    .eq("id", targetId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "radar_target_removed",
    subjectType: "radar_target",
    subjectId: targetId,
    actorKind: "user",
    actorId: ctx.user.id,
  });
}

// --- Scans (reads) ------------------------------------------------------------

export async function listScans(radarId: string, limit = 20): Promise<ScanRow[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("radar_id", radarId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// --- Signals + evaluations (reads, unchanged shape) ---------------------------

export async function listSignals(limit = 50): Promise<SignalRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function listEvaluations(options: {
  projectId?: string;
  signalIds?: string[];
}): Promise<EvaluationRow[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  let query = supabase
    .from("signal_evaluations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (options.projectId) query = query.eq("project_id", options.projectId);
  if (options.signalIds?.length) query = query.in("signal_id", options.signalIds);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// --- GitHub repo discovery (for target pickers) -------------------------------

export async function listInstallations(): Promise<InstallationRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("github_installations")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listAvailableRepos(): Promise<
  Array<GithubRepo & { githubInstallationId: number }>
> {
  const installations = await listInstallations();
  const results = await Promise.all(
    installations.map(async (installation) => {
      try {
        const repos = await listInstallationRepos(
          Number(installation.github_installation_id),
        );
        return repos.map((repo) => ({
          ...repo,
          githubInstallationId: Number(installation.github_installation_id),
        }));
      } catch (err) {
        console.error(
          `[radar] failed listing repos for installation ${installation.github_installation_id}:`,
          err,
        );
        return [];
      }
    }),
  );
  return results.flat();
}
