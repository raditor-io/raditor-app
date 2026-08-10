import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/shared/form-styles";
import { getEditor } from "@/services/editor";
import { requireOrgContext } from "@/services/org";
import { listProjects } from "@/services/project";
import { serverClient } from "@/lib/supabase/server";

import { toggleEditorAssignmentAction, updateEditorAction } from "../actions";

export const metadata = { title: "Editor | Raditor" };

export default async function EditorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const editor = await getEditor(id);
  if (!editor) notFound();

  const projects = await listProjects();
  const supabase = await serverClient();
  const { data: assignments } = await supabase
    .from("editor_agent_assignments")
    .select("project_id")
    .eq("editor_agent_id", editor.id);
  const assignedProjectIds = (assignments ?? []).map((a) => a.project_id);

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Persona</h2>
        {ctx.isAdmin ? (
          <ActionForm action={updateEditorAction} requireDirty>
            <input type="hidden" name="editor_id" value={editor.id} />
            <label className="block">
              <span className={LABEL_CLASSES}>Name</span>
              <input
                name="display_name"
                defaultValue={editor.display_name}
                required
                maxLength={120}
                className={INPUT_CLASSES}
              />
            </label>
            <label className="block">
              <span className={LABEL_CLASSES}>
                Persona (markdown; controls voice, attitude, and editorial
                posture)
              </span>
              <textarea
                name="persona_md"
                defaultValue={editor.persona_md}
                rows={18}
                className={`${INPUT_CLASSES} font-mono text-xs`}
              />
            </label>
          </ActionForm>
        ) : (
          <pre className="whitespace-pre-wrap rounded-md bg-hover p-4 font-mono text-xs text-foreground">
            {editor.persona_md || "(empty persona)"}
          </pre>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Assigned projects
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-faint">No projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => {
              const isAssigned = assignedProjectIds.includes(project.id);
              return (
                <li
                  key={project.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5"
                >
                  <span className="truncate text-sm text-foreground">
                    {project.display_name}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                      {isAssigned ? "assigned" : "not assigned"}
                    </span>
                    {ctx.isAdmin ? (
                      <form action={toggleEditorAssignmentAction}>
                        <input type="hidden" name="editor_id" value={editor.id} />
                        <input
                          type="hidden"
                          name="project_id"
                          value={project.id}
                        />
                        <input
                          type="hidden"
                          name="assign"
                          value={isAssigned ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className={
                            isAssigned
                              ? "text-xs text-accent-deep hover:underline"
                              : "text-xs text-accent hover:underline"
                          }
                        >
                          {isAssigned ? "Unassign" : "Assign"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
