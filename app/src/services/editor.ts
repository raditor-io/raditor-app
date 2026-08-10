/**
 * Editors service (editor_agents in the schema). Org-level entities with a
 * markdown persona, assignable to one or more projects.
 */
import type { Database } from "@/lib/database.types";
import { personaPreset } from "@/ai/personas";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireAdminContext, requireOrgContext } from "@/services/org";

export type EditorRow = Database["public"]["Tables"]["editor_agents"]["Row"];

export async function listEditors(): Promise<EditorRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("editor_agents")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getEditor(editorId: string): Promise<EditorRow | null> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("editor_agents")
    .select("*")
    .eq("id", editorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createEditor(input: {
  displayName: string;
  presetKey: string;
}): Promise<EditorRow> {
  const ctx = await requireAdminContext();
  const preset = personaPreset(input.presetKey);
  const supabase = await serverClient();

  const { data, error } = await supabase
    .from("editor_agents")
    .insert({
      organization_id: ctx.organization.id,
      display_name: input.displayName,
      persona_md: preset?.personaMd ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "editor_created",
    subjectType: "editor_agent",
    subjectId: data.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { display_name: input.displayName, preset: input.presetKey },
  });

  return data;
}

export async function updateEditor(
  editorId: string,
  patch: Partial<{ display_name: string; persona_md: string }>,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("editor_agents")
    .update(patch)
    .eq("id", editorId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "editor_updated",
    subjectType: "editor_agent",
    subjectId: editorId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { fields: Object.keys(patch) },
  });
}

/** Editor ids assigned to a project. */
export async function listAssignedEditorIds(
  projectId: string,
): Promise<string[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("editor_agent_assignments")
    .select("editor_agent_id")
    .eq("project_id", projectId);
  if (error) throw error;
  return data.map((row) => row.editor_agent_id);
}

export async function setAssignment(
  editorId: string,
  projectId: string,
  isAssigned: boolean,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  if (isAssigned) {
    const { error } = await supabase.from("editor_agent_assignments").upsert(
      {
        organization_id: ctx.organization.id,
        editor_agent_id: editorId,
        project_id: projectId,
      },
      { onConflict: "editor_agent_id,project_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("editor_agent_assignments")
      .delete()
      .eq("editor_agent_id", editorId)
      .eq("project_id", projectId);
    if (error) throw error;
  }

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: isAssigned ? "editor_assigned" : "editor_unassigned",
    subjectType: "editor_agent",
    subjectId: editorId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { project_id: projectId },
  });
}
