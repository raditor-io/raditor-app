"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/shared/action-form";
import { updateModelRouting } from "@/services/org";

const CONFIGURABLE_FUNCTIONALITIES = [
  "scan_summary",
  "scan_briefing",
  "signal_evaluation",
  "content_suggestion",
  "content_draft",
] as const;

const modelIdSchema = z
  .string()
  .max(120)
  .regex(/^[a-zA-Z0-9._\-\/]*$/, "Invalid model id");

export async function updateModelRoutingAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const routing: Record<string, string> = {};
  for (const functionality of CONFIGURABLE_FUNCTIONALITIES) {
    const value = formData.get(`model_${functionality}`);
    const parsed = modelIdSchema.safeParse(
      typeof value === "string" ? value.trim() : "",
    );
    if (!parsed.success) {
      return { error: `Invalid model id for ${functionality}.` };
    }
    routing[functionality] = parsed.data;
  }

  try {
    await updateModelRouting(routing);
    revalidatePath("/settings");
    return { notice: "Model routing saved." };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Could not save model routing.",
    };
  }
}
