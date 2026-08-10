/**
 * Project service (a project is a website-shaped content property; PROJECT.md
 * calls the concept "website"). Reads for members, writes admin-only (RLS is
 * the backstop; requireAdminContext gives clear errors).
 */
import type { Database, Json } from "@/lib/database.types";
import {
  slugify,
  type SiteType,
} from "@/lib/schemas/project-config";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireAdminContext, requireOrgContext } from "@/services/org";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export async function listProjects(): Promise<ProjectRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getProject(projectId: string): Promise<ProjectRow | null> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface CreateProjectInput {
  displayName: string;
  siteType: SiteType;
  deployGithubInstallationId?: number;
  deployRepoFullName?: string;
  deployBaseBranch?: string;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectRow> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  const base = slugify(input.displayName);
  // Suffix on collision; two attempts is plenty at MVP scale.
  const { data: existing } = await supabase
    .from("projects")
    .select("slug")
    .eq("organization_id", ctx.organization.id)
    .eq("slug", base)
    .maybeSingle();
  const slug = existing ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: ctx.organization.id,
      display_name: input.displayName,
      slug,
      site_type: input.siteType,
      deploy_github_installation_id: input.deployGithubInstallationId ?? null,
      deploy_repo_full_name: input.deployRepoFullName ?? null,
      deploy_base_branch: input.deployBaseBranch ?? "main",
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "project_created",
    subjectType: "project",
    subjectId: data.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { display_name: input.displayName, site_type: input.siteType },
  });

  return data;
}

/** Partial settings update; callers pass validated column values. */
export async function updateProjectSettings(
  projectId: string,
  patch: Partial<{
    display_name: string;
    site_type: string;
    purpose_md: string;
    do_not_write_md: string;
    suggestion_interval: string;
    max_suggestions_per_interval: number;
    deploy_github_installation_id: number | null;
    deploy_repo_full_name: string | null;
    deploy_base_branch: string;
    deploy_path_allowlist: string[];
    deploy_pr_mode: string;
    url_mapping_config: Json;
  }>,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "project_settings_updated",
    subjectType: "project",
    subjectId: projectId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { fields: Object.keys(patch) },
  });
}
