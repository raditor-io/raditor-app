"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/components/shared/action-form";
import { SITE_TYPES, watchConfigSchema } from "@/lib/schemas/project-config";
import { createProject } from "@/services/project";
import { createRadar } from "@/services/radar";

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

    // Default wiring for the hero loop: the deploy repo gets a seeded radar
    // watching it. Adjustable later in the project's Radar tab.
    if (repo) {
      await createRadar({
        projectId,
        name: `${repo.fullName} radar`,
        directiveMd: `Watch the GitHub repository ${repo.fullName} for releases, merged changes, and labeled issues relevant to this project.`,
        scanStrategies: ["target_emitted_events"],
        repoTarget: {
          githubInstallationId: repo.installationId,
          repoFullName: repo.fullName,
          watchConfig: watchConfigSchema.parse({}),
        },
      });
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not create the project.",
    };
  }

  redirect(`/projects/${projectId}`);
}
