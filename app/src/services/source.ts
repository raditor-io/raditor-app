/**
 * Sources service. Sources are org-level GitHub repo connections; projects
 * subscribe via project_sources. The UX lives in project settings but the
 * rows stay org-scoped so one repo can feed many projects (cross-site
 * fan-out).
 */
import type { Database } from "@/lib/database.types";
import { listInstallationRepos, type GithubRepo } from "@/github/api";
import type { WatchConfigInput } from "@/lib/schemas/project-config";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireAdminContext, requireOrgContext } from "@/services/org";

export type SourceRow = Database["public"]["Tables"]["sources"]["Row"];
export type InstallationRow =
  Database["public"]["Tables"]["github_installations"]["Row"];

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

export async function listSources(): Promise<SourceRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .eq("is_active", true)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return data;
}

/** Repos reachable through all active installations (for the repo picker). */
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
          `[sources] failed listing repos for installation ${installation.github_installation_id}:`,
          err,
        );
        return [];
      }
    }),
  );
  return results.flat();
}

/** Idempotently ensure an org source row for a repo, returning its id. */
export async function ensureSource(input: {
  githubInstallationId: number;
  repoFullName: string;
  watchConfig: WatchConfigInput;
}): Promise<string> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("organization_id", ctx.organization.id)
    .eq("github_repo_full_name", input.repoFullName)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("sources")
      .update({
        is_active: true,
        github_installation_id: input.githubInstallationId,
        watch_config: input.watchConfig,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("sources")
    .insert({
      organization_id: ctx.organization.id,
      display_name: input.repoFullName,
      github_installation_id: input.githubInstallationId,
      github_repo_full_name: input.repoFullName,
      watch_config: input.watchConfig,
    })
    .select("id")
    .single();
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "source_connected",
    subjectType: "source",
    subjectId: data.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { repo: input.repoFullName },
  });

  return data.id;
}

export async function listSubscribedSourceIds(
  projectId: string,
): Promise<string[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("project_sources")
    .select("source_id")
    .eq("project_id", projectId);
  if (error) throw error;
  return data.map((row) => row.source_id);
}

export async function setSubscription(
  projectId: string,
  sourceId: string,
  isSubscribed: boolean,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  if (isSubscribed) {
    const { error } = await supabase.from("project_sources").upsert(
      {
        organization_id: ctx.organization.id,
        project_id: projectId,
        source_id: sourceId,
      },
      { onConflict: "project_id,source_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("project_sources")
      .delete()
      .eq("project_id", projectId)
      .eq("source_id", sourceId);
    if (error) throw error;
  }

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: isSubscribed ? "source_subscribed" : "source_unsubscribed",
    subjectType: "project",
    subjectId: projectId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { source_id: sourceId },
  });
}
