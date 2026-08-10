"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setAssignment } from "@/services/editor";

const toggleSchema = z.object({
  project_id: z.uuid(),
  editor_id: z.uuid(),
  assign: z.enum(["true", "false"]),
});

export async function toggleAssignmentAction(formData: FormData): Promise<void> {
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setAssignment(
    parsed.data.editor_id,
    parsed.data.project_id,
    parsed.data.assign === "true",
  );
  revalidatePath(`/projects/${parsed.data.project_id}/editors`);
}
