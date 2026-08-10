"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/components/shared/action-form";
import { SITE_TYPES, watchConfigSchema } from "@/lib/schemas/project-config";
import { createProject } from "@/services/project";
import { ensureSource, setSubscription } from "@/services/source";

const createSchema = z.object({
  display_name: z.string().min(1).max(120),
  site_type: z.enum(SITE_TYPES),
  // "<installationId>::<fullName>::<defaultBranch>" or "" when no repo yet.
  repo_choice: z.string(),
});

export async function createProjectAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter a project name and pick a site type." };
  }

  let repo:
    | { installationId: number; fullName: string; defaultBranch: string }
    | null = null;
  if (parsed.data.repo_choice) {
    const [installationId, fullName, defaultBranch] =
      parsed.data.repo_choice.split("::");
    if (!installationId || !fullName) {
      return { error: "Invalid repository choice." };
    }
    repo = {
      installationId: Number(installationId),
      fullName,
      defaultBranch: defaultBranch || "main",
    };
  }

  let projectId: string;
  try {
    const project = await createProject({
      displayName: parsed.data.display_name,
      siteType: parsed.data.site_type,
      deployGithubInstallationId: repo?.installationId,
      deployRepoFullName: repo?.fullName,
      deployBaseBranch: repo?.defaultBranch,
    });
    projectId = project.id;

    // Default wiring for the hero loop: the deploy repo is also watched as a
    // source and subscribed. Adjustable later in project settings.
    if (repo) {
      const sourceId = await ensureSource({
        githubInstallationId: repo.installationId,
        repoFullName: repo.fullName,
        watchConfig: watchConfigSchema.parse({}),
      });
      await setSubscription(projectId, sourceId, true);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not create the project.",
    };
  }

  redirect(`/projects/${projectId}`);
}
