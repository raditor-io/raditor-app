/**
 * Radar service (radars are the org-bound, top-level unit): a radar is one
 * monitored matter with a prose directive, optional targets, and enabled
 * scan strategies. Reads for members, configuration writes admin-only.
 * Inbox/scan/output/signal writes happen in jobs via the service role.
 */
import type { Database, Json } from "@/lib/database.types";
import { listInstallationRepos, type GithubRepo } from "@/github/api";
import { pageRange, type ListParams } from "@/lib/list-params";
import { slugify, type WatchConfigInput } from "@/lib/schemas/radar-config";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireAdminContext, requireOrgContext } from "@/services/org";

export type RadarRow = Database["public"]["Tables"]["radars"]["Row"];
export type RadarTargetRow = Database["public"]["Tables"]["radar_targets"]["Row"];
export type ScanRow = Database["public"]["Tables"]["scans"]["Row"];
export type SignalRow = Database["public"]["Tables"]["signals"]["Row"];
export type InstallationRow =
  Database["public"]["Tables"]["github_installations"]["Row"];

export const SCAN_STRATEGIES = [
  "ai_briefing",
  "target_emitted_events",
] as const;
export type ScanStrategy = (typeof SCAN_STRATEGIES)[number];

/**
 * Briefing scans burn web-search tokens on every run; radars that only hunt
 * the web default to a generous interval (6h). Event-driven radars keep the
 * DB default (30m sweep as an inbox backstop).
 */
const BRIEFING_ONLY_INTERVAL_MINUTES = 360;

// --- Radars -------------------------------------------------------------------

export async function listRadars(): Promise<RadarRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("radars")
    .select("*")
    .eq("organization_id", ctx.organization.id)
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

  const base = slugify(input.name);
  // Suffix on collision; two attempts is plenty at MVP scale.
  const { data: existing } = await supabase
    .from("radars")
    .select("slug")
    .eq("organization_id", ctx.organization.id)
    .eq("slug", base)
    .maybeSingle();
  const slug = existing
    ? `${base}-${Math.random().toString(36).slice(2, 6)}`
    : base;

  const isBriefingOnly =
    input.scanStrategies.length === 1 &&
    input.scanStrategies[0] === "ai_briefing";

  const { data: radar, error } = await supabase
    .from("radars")
    .insert({
      organization_id: ctx.organization.id,
      name: input.name,
      slug,
      directive_md: input.directiveMd,
      scan_strategies: input.scanStrategies,
      ...(isBriefingOnly
        ? { scan_interval_minutes: BRIEFING_ONLY_INTERVAL_MINUTES }
        : {}),
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
    payload: { name: input.name, slug },
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

/**
 * Pause switch (deactivated_at): a deactivated radar stays configured and
 * listed, but scheduling and scan execution skip it.
 */
export async function setRadarActivation(
  radarId: string,
  isActive: boolean,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("radars")
    .update({ deactivated_at: isActive ? null : new Date().toISOString() })
    .eq("id", radarId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: isActive ? "radar_activated" : "radar_deactivated",
    subjectType: "radar",
    subjectId: radarId,
    actorKind: "user",
    actorId: ctx.user.id,
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

// --- Signals (reads) ----------------------------------------------------------

export async function listSignals(options?: {
  radarId?: string;
  limit?: number;
}): Promise<SignalRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  let query = supabase
    .from("signals")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);
  if (options?.radarId) query = query.eq("radar_id", options.radarId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Escape ilike wildcards in user search input. */
function likePattern(q: string): string {
  return `%${q.replace(/[%_]/g, "\\$&")}%`;
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
}

export async function listRadarsPaged(params: ListParams): Promise<
  PagedResult<RadarRow>
> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { from, to } = pageRange(params);
  let query = supabase
    .from("radars")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .range(from, to);
  if (params.q) query = query.ilike("name", likePattern(params.q));
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function listSignalsPaged(
  radarId: string,
  params: ListParams,
): Promise<PagedResult<SignalRow>> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { from, to } = pageRange(params);
  let query = supabase
    .from("signals")
    .select("*", { count: "exact" })
    .eq("radar_id", radarId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (params.q) query = query.ilike("title", likePattern(params.q));
  if (params.kind) query = query.eq("kind", params.kind);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/** Distinct signal kinds of one radar (filter options). */
export async function listSignalKinds(radarId: string): Promise<string[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("signals")
    .select("kind")
    .eq("radar_id", radarId)
    .limit(1000);
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.kind))].sort();
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
