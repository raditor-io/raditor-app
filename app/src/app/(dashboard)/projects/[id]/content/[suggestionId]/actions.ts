"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { enqueueJob } from "@/jobs/queue";
import { setSuggestionStatus } from "@/services/suggestion";

const decisionSchema = z.object({
  project_id: z.uuid(),
  suggestion_id: z.uuid(),
  decision: z.enum(["accepted", "dismissed"]),
});

export async function decideSuggestionAction(formData: FormData): Promise<void> {
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setSuggestionStatus(parsed.data.suggestion_id, parsed.data.decision);

  // Accept starts the publish chain: render drafts, then open the PR.
  if (parsed.data.decision === "accepted") {
    await enqueueJob("publish", "render_suggestion_drafts", {
      suggestionId: parsed.data.suggestion_id,
    });
  }

  revalidatePath(
    `/projects/${parsed.data.project_id}/content/${parsed.data.suggestion_id}`,
  );
  revalidatePath(`/projects/${parsed.data.project_id}/content`);
}
