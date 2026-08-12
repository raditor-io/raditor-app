"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/shared/action-form";
import { errorMessage } from "@/lib/error-message";
import { watchConfigSchema } from "@/lib/schemas/radar-config";
import {
  addRepoTarget,
  createRadar,
  removeTarget,
  SCAN_STRATEGIES,
  setRadarActivation,
  updateRadar,
  type ScanStrategy,
} from "@/services/radar";

function selectedStrategies(formData: FormData): ScanStrategy[] {
  const strategies = SCAN_STRATEGIES.filter(
    (strategy) => formData.get(`strategy_${strategy}`) === "on",
  );
  return strategies.length > 0 ? strategies : ["ai_briefing"];
}

function parseRepoChoice(
  choice: string,
): { installationId: number; fullName: string } | null {
  if (!choice) return null;
  const [installationId, fullName] = choice.split("::");
  if (!installationId || !fullName) return null;
  return { installationId: Number(installationId), fullName };
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  directive_md: z.string().min(1).max(10_000),
  repo_choice: z.string(),
});

export async function createRadarAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    directive_md: formData.get("directive_md"),
    repo_choice: formData.get("repo_choice") ?? "",
  });
  if (!parsed.success) {
    return { error: "Give the radar a name and a directive." };
  }
  const repo = parseRepoChoice(parsed.data.repo_choice);

  let radarId: string;
  try {
    const radar = await createRadar({
      name: parsed.data.name,
      directiveMd: parsed.data.directive_md,
      scanStrategies: selectedStrategies(formData),
      repoTarget: repo
        ? {
            githubInstallationId: repo.installationId,
            repoFullName: repo.fullName,
            watchConfig: watchConfigSchema.parse({}),
          }
        : undefined,
    });
    radarId = radar.id;
  } catch (err) {
    return {
      error: errorMessage(err, "Could not create the radar."),
    };
  }
  redirect(`/radars/${radarId}`);
}

const updateSchema = z.object({
  radar_id: z.uuid(),
  name: z.string().min(1).max(120),
  directive_md: z.string().min(1).max(10_000),
  scan_interval_minutes: z.coerce.number().int().min(5).max(10_080),
});

export async function updateRadarAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse({
    radar_id: formData.get("radar_id"),
    name: formData.get("name"),
    directive_md: formData.get("directive_md"),
    scan_interval_minutes: formData.get("scan_interval_minutes"),
  });
  if (!parsed.success) return { error: "Check the radar fields." };
  try {
    await updateRadar(parsed.data.radar_id, {
      name: parsed.data.name,
      directive_md: parsed.data.directive_md,
      scan_interval_minutes: parsed.data.scan_interval_minutes,
      scan_strategies: selectedStrategies(formData),
    });
    revalidatePath(`/radars/${parsed.data.radar_id}`, "layout");
    return { notice: "Radar saved." };
  } catch (err) {
    return {
      error: errorMessage(err, "Could not save the radar."),
    };
  }
}

const addTargetSchema = z.object({
  radar_id: z.uuid(),
  repo_choice: z.string().min(1),
});

export async function addRepoTargetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = addTargetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a repository first." };
  const repo = parseRepoChoice(parsed.data.repo_choice);
  if (!repo) return { error: "Invalid repository choice." };
  try {
    await addRepoTarget(parsed.data.radar_id, {
      githubInstallationId: repo.installationId,
      repoFullName: repo.fullName,
      watchConfig: watchConfigSchema.parse({}),
    });
    revalidatePath(`/radars/${parsed.data.radar_id}`, "layout");
    return { notice: `${repo.fullName} added as target.` };
  } catch (err) {
    return {
      error: errorMessage(err, "Could not add the target."),
    };
  }
}

const activationSchema = z.object({
  radar_id: z.uuid(),
  is_active: z.boolean(),
});

/** Bound from the radars list row menu: (radarId, isActive) via .bind(). */
export async function setRadarActivationAction(
  radarId: string,
  isActive: boolean,
): Promise<void> {
  const parsed = activationSchema.safeParse({
    radar_id: radarId,
    is_active: isActive,
  });
  if (!parsed.success) return;
  await setRadarActivation(parsed.data.radar_id, parsed.data.is_active);
  revalidatePath("/radars");
}

const removeTargetSchema = z.object({
  radar_id: z.uuid(),
  target_id: z.uuid(),
});

export async function removeTargetAction(formData: FormData): Promise<void> {
  const parsed = removeTargetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await removeTarget(parsed.data.target_id);
  revalidatePath(`/radars/${parsed.data.radar_id}`, "layout");
}
