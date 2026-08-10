"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/shared/action-form";
import {
  parseAllowlistLines,
  pathAllowlistSchema,
  SITE_TYPES,
  SUGGESTION_INTERVALS,
  urlMappingConfigSchema,
  watchConfigSchema,
} from "@/lib/schemas/project-config";
import { updateProjectSettings } from "@/services/project";
import { ensureSource, setSubscription } from "@/services/source";

function fail(err: unknown, fallback: string): ActionResult {
  return { error: err instanceof Error ? err.message : fallback };
}

const generalSchema = z.object({
  project_id: z.uuid(),
  display_name: z.string().min(1).max(120),
  site_type: z.enum(SITE_TYPES),
  purpose_md: z.string().max(20_000),
  do_not_write_md: z.string().max(20_000),
});

export async function updateGeneralAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = generalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the general settings fields." };
  const { project_id, ...patch } = parsed.data;
  try {
    await updateProjectSettings(project_id, patch);
    revalidatePath(`/projects/${project_id}/settings`);
    return { notice: "General settings saved." };
  } catch (err) {
    return fail(err, "Could not save general settings.");
  }
}

const cadenceSchema = z.object({
  project_id: z.uuid(),
  suggestion_interval: z.enum(SUGGESTION_INTERVALS),
  max_suggestions_per_interval: z.coerce.number().int().min(1).max(50),
});

export async function updateCadenceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = cadenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the cadence fields." };
  const { project_id, ...patch } = parsed.data;
  try {
    await updateProjectSettings(project_id, patch);
    revalidatePath(`/projects/${project_id}/settings`);
    return { notice: "Cadence saved." };
  } catch (err) {
    return fail(err, "Could not save cadence.");
  }
}

const deploySchema = z.object({
  project_id: z.uuid(),
  // "<installationId>::<fullName>::<defaultBranch>" from the repo picker, or "".
  repo_choice: z.string(),
  deploy_base_branch: z.string().min(1).max(200),
  allowlist_text: z.string().max(10_000),
  deploy_pr_mode: z.enum(["direct", "fork"]),
});

export async function updateDeployAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = deploySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the deploy fields." };

  const allowlist = pathAllowlistSchema.safeParse(
    parseAllowlistLines(parsed.data.allowlist_text),
  );
  if (!allowlist.success) {
    return {
      error:
        "Allowlist entries must be repo-relative paths without '..' (one per line).",
    };
  }

  const patch: Parameters<typeof updateProjectSettings>[1] = {
    deploy_base_branch: parsed.data.deploy_base_branch,
    deploy_path_allowlist: allowlist.data,
    deploy_pr_mode: parsed.data.deploy_pr_mode,
  };
  if (parsed.data.repo_choice) {
    const [installationId, fullName] = parsed.data.repo_choice.split("::");
    if (!installationId || !fullName) return { error: "Invalid repository choice." };
    patch.deploy_github_installation_id = Number(installationId);
    patch.deploy_repo_full_name = fullName;
  }

  try {
    await updateProjectSettings(parsed.data.project_id, patch);
    revalidatePath(`/projects/${parsed.data.project_id}/settings`);
    return { notice: "Deploy settings saved." };
  } catch (err) {
    return fail(err, "Could not save deploy settings.");
  }
}

const urlMappingFormSchema = z.object({
  project_id: z.uuid(),
  url_mapping_json: z.string().max(20_000),
});

export async function updateUrlMappingAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = urlMappingFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the URL mapping field." };

  let json: unknown;
  try {
    json = JSON.parse(parsed.data.url_mapping_json || "[]");
  } catch {
    return { error: "URL mapping must be valid JSON." };
  }
  const rules = urlMappingConfigSchema.safeParse(json);
  if (!rules.success) {
    return {
      error:
        'URL mapping must be an array of {"pattern": "content/blog/*.mdx", "url": "/blog/{slug}"} rules (repo-relative patterns, URLs starting with /).',
    };
  }

  try {
    await updateProjectSettings(parsed.data.project_id, {
      url_mapping_config: rules.data,
    });
    revalidatePath(`/projects/${parsed.data.project_id}/settings`);
    return { notice: "URL mapping saved." };
  } catch (err) {
    return fail(err, "Could not save URL mapping.");
  }
}

const subscriptionSchema = z.object({
  project_id: z.uuid(),
  source_id: z.uuid(),
  subscribe: z.enum(["true", "false"]),
});

export async function toggleSubscriptionAction(
  formData: FormData,
): Promise<void> {
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setSubscription(
    parsed.data.project_id,
    parsed.data.source_id,
    parsed.data.subscribe === "true",
  );
  revalidatePath(`/projects/${parsed.data.project_id}/settings`);
}

const addRepoSchema = z.object({
  project_id: z.uuid(),
  repo_choice: z.string().min(1),
  is_watching_releases: z.string().optional(),
  is_watching_default_branch_merges: z.string().optional(),
  is_watching_labeled_issues: z.string().optional(),
  issue_labels: z.string().optional(),
});

export async function addRepoSourceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = addRepoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a repository first." };

  const [installationId, fullName] = parsed.data.repo_choice.split("::");
  if (!installationId || !fullName) return { error: "Invalid repository choice." };

  const watch = watchConfigSchema.parse({
    is_watching_releases: parsed.data.is_watching_releases === "on",
    is_watching_default_branch_merges:
      parsed.data.is_watching_default_branch_merges === "on",
    is_watching_labeled_issues: parsed.data.is_watching_labeled_issues === "on",
    issue_labels: (parsed.data.issue_labels ?? "")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean),
  });

  try {
    const sourceId = await ensureSource({
      githubInstallationId: Number(installationId),
      repoFullName: fullName,
      watchConfig: watch,
    });
    await setSubscription(parsed.data.project_id, sourceId, true);
    revalidatePath(`/projects/${parsed.data.project_id}/settings`);
    return { notice: `${fullName} connected and subscribed.` };
  } catch (err) {
    return fail(err, "Could not connect the repository.");
  }
}
