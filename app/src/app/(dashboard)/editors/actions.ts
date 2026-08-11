"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/shared/action-form";
import { errorMessage } from "@/lib/error-message";
import { createEditor, setAssignment, updateEditor } from "@/services/editor";

const createSchema = z.object({
  display_name: z.string().min(1).max(120),
  preset_key: z.enum(["conservative", "balanced", "proactive"]),
});

export async function createEditorAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter a name and pick a persona preset." };
  }
  let editorId: string;
  try {
    const editor = await createEditor({
      displayName: parsed.data.display_name,
      presetKey: parsed.data.preset_key,
    });
    editorId = editor.id;
  } catch (err) {
    return {
      error: errorMessage(err, "Could not create the editor."),
    };
  }
  redirect(`/editors/${editorId}`);
}

const updateSchema = z.object({
  editor_id: z.uuid(),
  display_name: z.string().min(1).max(120),
  persona_md: z.string().max(50_000),
});

export async function updateEditorAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the editor fields." };
  try {
    await updateEditor(parsed.data.editor_id, {
      display_name: parsed.data.display_name,
      persona_md: parsed.data.persona_md,
    });
    revalidatePath(`/editors/${parsed.data.editor_id}`);
    return { notice: "Editor saved." };
  } catch (err) {
    return {
      error: errorMessage(err, "Could not save the editor."),
    };
  }
}

const assignSchema = z.object({
  editor_id: z.uuid(),
  project_id: z.uuid(),
  assign: z.enum(["true", "false"]),
});

export async function toggleEditorAssignmentAction(
  formData: FormData,
): Promise<void> {
  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setAssignment(
    parsed.data.editor_id,
    parsed.data.project_id,
    parsed.data.assign === "true",
  );
  revalidatePath(`/editors/${parsed.data.editor_id}`);
}
